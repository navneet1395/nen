import * as nenCrypto from '@withnen/core-crypto';
import { storeSession } from '../store';
import { verifyRequest, decryptBody, handleHandshake } from '../middleware';
import { withNen } from '../wrapper';

// Ensure a Web Crypto implementation exists in the Node test environment
// (handleHandshake uses crypto.getRandomValues + crypto.randomUUID).
if (!globalThis.crypto || !(globalThis.crypto as any).getRandomValues) {
  globalThis.crypto = require('crypto').webcrypto as any;
}

const url = 'http://localhost/api/test';
const path = '/api/test';
const method = 'POST';

/**
 * Build a fully valid, signed encrypted request for a given session
 * (NEN-PROTOCOL-V2: the nonce is the per-request nonce, carried in X-Nen-Nonce;
 * the request body is `{ ct }`).
 */
function makeSignedRequest(sharedSecret: Uint8Array, hmacKey: Uint8Array, plaintext: string) {
  const nonce = nenCrypto.nen_generate_nonce();
  const ctBytes = nenCrypto.nen_encrypt(
    sharedSecret,
    nonce,
    new TextEncoder().encode(plaintext)
  );
  const n = nenCrypto.nen_to_base64(nonce);
  const ct = nenCrypto.nen_to_base64(ctBytes);
  const timestamp = String(Date.now());
  const canonical = `${method}\n${path}\n${timestamp}\n${n}`;
  const signature = nenCrypto.nen_to_base64(
    nenCrypto.nen_hmac_sign(hmacKey, new TextEncoder().encode(canonical))
  );
  return { ct, n, requestMeta: { method, url, timestamp, signature } };
}

describe('Replay protection', () => {
  test('a replayed (reused-nonce) request is rejected with ISO-5001', async () => {
    const sessionId = 'replay-session';
    const sharedSecret = new Uint8Array(32).fill(3);
    const hmacKey = new Uint8Array(32).fill(7);
    storeSession(sessionId, sharedSecret, hmacKey);

    const req = makeSignedRequest(sharedSecret, hmacKey, '{"hello":"world"}');

    // First delivery authenticates and decrypts.
    const session = await verifyRequest(sessionId, req.n, req.requestMeta);
    const first = decryptBody(session, req.ct, req.n);
    expect(new TextDecoder().decode(first)).toBe('{"hello":"world"}');

    // Exact replay of the same signed request (same nonce) → rejected at verify.
    await expect(
      verifyRequest(sessionId, req.n, req.requestMeta)
    ).rejects.toMatchObject({ code: 'ISO-5001' });
  });
});

describe('AEAD tamper detection at the HTTP layer', () => {
  test('tampered ciphertext throws ISO-4001, never returns garbage', async () => {
    const sessionId = 'tamper-session';
    const sharedSecret = new Uint8Array(32).fill(5);
    const hmacKey = new Uint8Array(32).fill(9);
    storeSession(sessionId, sharedSecret, hmacKey);

    const req = makeSignedRequest(sharedSecret, hmacKey, '{"x":1}');

    // Flip one byte of the ciphertext. The HMAC canonical string covers the
    // nonce, not the ciphertext, so the signature still verifies — the AEAD tag
    // is what must catch this.
    const ctBytes = nenCrypto.nen_from_base64(req.ct);
    ctBytes[0] ^= 0xff;
    const tamperedCt = nenCrypto.nen_to_base64(ctBytes);

    const session = await verifyRequest(sessionId, req.n, req.requestMeta);
    expect(() => decryptBody(session, tamperedCt, req.n)).toThrow(
      expect.objectContaining({ code: 'ISO-4001' })
    );
  });

  test('withNen returns 400 ISO-4001 for tampered ciphertext', async () => {
    const sessionId = 'tamper-session-http';
    const sharedSecret = new Uint8Array(32).fill(5);
    const hmacKey = new Uint8Array(32).fill(9);
    storeSession(sessionId, sharedSecret, hmacKey);

    const req = makeSignedRequest(sharedSecret, hmacKey, '{"x":1}');
    const ctBytes = nenCrypto.nen_from_base64(req.ct);
    ctBytes[0] ^= 0xff;
    const tamperedCt = nenCrypto.nen_to_base64(ctBytes);

    const handler = withNen(async () => ({ ok: true }));
    const httpReq = new Request(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Nen-Session': sessionId,
        'X-Nen-Timestamp': req.requestMeta.timestamp,
        'X-Nen-Nonce': req.n,
        'X-Nen-Signature': req.requestMeta.signature,
      },
      body: JSON.stringify({ ct: tamperedCt }),
    });

    const res = await handler(httpReq);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('ISO-4001');
  });
});

describe('Optional PQC identity (ML-DSA)', () => {
  test('an invalid identity signature is rejected with ISO-3004', async () => {
    const kem = nenCrypto.nen_generate_keypair();
    const pk = kem.public_key;

    const signing = nenCrypto.nen_generate_signing_keypair();
    // Sign the WRONG message so verify(sigPk, pk, sig) fails — a well-formed but
    // invalid identity proof (as a MITM presenting the wrong key would produce).
    const badSig = nenCrypto.nen_sign(
      signing.secret_key,
      new TextEncoder().encode('not the public key')
    );

    const httpReq = new Request('http://localhost/api/nen/handshake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pk: nenCrypto.nen_to_base64(pk),
        sigPk: nenCrypto.nen_to_base64(signing.public_key),
        sigOfPk: nenCrypto.nen_to_base64(badSig),
      }),
    });

    const res = await handleHandshake(httpReq);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('ISO-3004');
  });

  test('a valid identity signature is accepted', async () => {
    const kem = nenCrypto.nen_generate_keypair();
    const pk = kem.public_key;

    const signing = nenCrypto.nen_generate_signing_keypair();
    const goodSig = nenCrypto.nen_sign(signing.secret_key, pk);

    const httpReq = new Request('http://localhost/api/nen/handshake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pk: nenCrypto.nen_to_base64(pk),
        sigPk: nenCrypto.nen_to_base64(signing.public_key),
        sigOfPk: nenCrypto.nen_to_base64(goodSig),
      }),
    });

    const res = await handleHandshake(httpReq);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sid).toBeDefined();
    expect(body.ct).toBeDefined();
    expect(body.hmac).toBeDefined();
  });
});
