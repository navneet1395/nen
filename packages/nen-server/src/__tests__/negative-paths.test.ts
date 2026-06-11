import * as nenCrypto from '@withnen/core-crypto';
import { storeSession } from '../store';
import { verifyRequest, decryptBody, handleHandshake, setServerIdentity } from '../middleware';
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
 * (NEN-PROTOCOL-V3: encKey seals the body, macKey signs the canonical string;
 * the nonce is the per-request nonce carried in X-Nen-Nonce, body is `{ ct }`).
 */
function makeSignedRequest(encKey: Uint8Array, macKey: Uint8Array, plaintext: string) {
  const nonce = nenCrypto.nen_generate_nonce();
  const ctBytes = nenCrypto.nen_encrypt(
    encKey,
    nonce,
    new TextEncoder().encode(plaintext)
  );
  const n = nenCrypto.nen_to_base64(nonce);
  const ct = nenCrypto.nen_to_base64(ctBytes);
  const timestamp = String(Date.now());
  const canonical = `${method}\n${path}\n${timestamp}\n${n}`;
  const signature = nenCrypto.nen_to_base64(
    nenCrypto.nen_hmac_sign(macKey, new TextEncoder().encode(canonical))
  );
  return { ct, n, requestMeta: { method, url, timestamp, signature } };
}

describe('Replay protection', () => {
  test('a replayed (reused-nonce) request is rejected with ISO-5001', async () => {
    const sessionId = 'replay-session';
    const encKey = new Uint8Array(32).fill(3);
    const macKey = new Uint8Array(32).fill(7);
    storeSession(sessionId, encKey, macKey);

    const req = makeSignedRequest(encKey, macKey, '{"hello":"world"}');

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
    const encKey = new Uint8Array(32).fill(5);
    const macKey = new Uint8Array(32).fill(9);
    storeSession(sessionId, encKey, macKey);

    const req = makeSignedRequest(encKey, macKey, '{"x":1}');

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
    const encKey = new Uint8Array(32).fill(5);
    const macKey = new Uint8Array(32).fill(9);
    storeSession(sessionId, encKey, macKey);

    const req = makeSignedRequest(encKey, macKey, '{"x":1}');
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

describe('V3 transcript-bound server identity (ML-DSA)', () => {
  afterEach(() => {
    // Reset the module-level identity so other suites are unaffected.
    (setServerIdentity as any)(new Uint8Array(0), new Uint8Array(0));
  });

  function pqcHandshakeReq(securityMode: 'hybrid' | 'pqc-only' = 'hybrid') {
    const kem = nenCrypto.nen_generate_keypair();
    const x = nenCrypto.nen_x25519_keypair();
    const body: any = {
      pk_kem: nenCrypto.nen_to_base64(kem.public_key),
      securityMode,
    };
    if (securityMode === 'hybrid') body.pk_x = nenCrypto.nen_to_base64(x.public_key);
    return {
      kem,
      x,
      req: new Request('http://localhost/api/nen/handshake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    };
  }

  test('server signs the transcript; client verifies it and detects a swapped nonce (ISO-3007)', async () => {
    const id = nenCrypto.nen_generate_signing_keypair();
    setServerIdentity(id.secret_key, id.public_key);

    const { kem, x, req } = pqcHandshakeReq('hybrid');
    const res = await handleHandshake(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    // No key material is ever emitted, even in identity mode.
    expect(json.hmac).toBeUndefined();
    expect(json.server_sig).toBeDefined();
    expect(json.server_nonce).toBeDefined();
    expect(json.server_id_pk).toBeDefined();

    const sidBytes = new TextEncoder().encode(json.sid);
    const serverNonce = nenCrypto.nen_from_base64(json.server_nonce);
    const idPk = nenCrypto.nen_from_base64(json.server_id_pk);
    const sig = nenCrypto.nen_from_base64(json.server_sig);

    // Correct transcript verifies.
    const good = nenCrypto.nen_transcript_hash(kem.public_key, x.public_key, serverNonce, sidBytes);
    expect(nenCrypto.nen_verify_signature(idPk, good, sig)).toBe(true);

    // A substituted server nonce yields a different transcript → signature fails
    // (this is what the client maps to ISO-3007).
    const swapped = nenCrypto.nen_transcript_hash(
      kem.public_key,
      x.public_key,
      new Uint8Array(serverNonce.length).fill(0),
      sidBytes
    );
    expect(nenCrypto.nen_verify_signature(idPk, swapped, sig)).toBe(false);
  });

  test('a signature from the wrong identity key fails verification (ISO-3006 territory)', async () => {
    const id = nenCrypto.nen_generate_signing_keypair();
    setServerIdentity(id.secret_key, id.public_key);

    const { kem, x, req } = pqcHandshakeReq('hybrid');
    const json = await (await handleHandshake(req)).json();

    const sidBytes = new TextEncoder().encode(json.sid);
    const serverNonce = nenCrypto.nen_from_base64(json.server_nonce);
    const transcript = nenCrypto.nen_transcript_hash(kem.public_key, x.public_key, serverNonce, sidBytes);
    const sig = nenCrypto.nen_from_base64(json.server_sig);

    // Verifying against an attacker's identity key must fail.
    const attacker = nenCrypto.nen_generate_signing_keypair();
    expect(nenCrypto.nen_verify_signature(attacker.public_key, transcript, sig)).toBe(false);
  });
});

