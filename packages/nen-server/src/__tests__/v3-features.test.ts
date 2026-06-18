import * as nenCrypto from '@withnen/core-crypto';
import { storeSession, getSession } from '../store';
import {
  verifyRequest,
  decryptBody,
  handleRekey,
  setServerIdentity,
  issueAttestation,
  verifyAttestation,
  type NenAttestation,
} from '../middleware';

if (!globalThis.crypto || !(globalThis.crypto as any).getRandomValues) {
  globalThis.crypto = require('crypto').webcrypto as any;
}

/** Build a signed request envelope (V3) for a given key + method + path. */
function signed(macKey: Uint8Array, method: string, url: string) {
  const path = new URL(url).pathname;
  const nonce = nenCrypto.nen_generate_nonce();
  const n = nenCrypto.nen_to_base64(nonce);
  const timestamp = String(Date.now());
  const canonical = `${method}\n${path}\n${timestamp}\n${n}`;
  const signature = nenCrypto.nen_to_base64(
    nenCrypto.nen_hmac_sign(macKey, new TextEncoder().encode(canonical)),
  );
  return { n, requestMeta: { method, url, timestamp, signature } };
}

describe('T5 — in-session rekey ratchet', () => {
  const rekeyUrl = 'http://localhost/api/nen/rekey';

  test('advances both keys deterministically; old key stops working, ratcheted key round-trips', async () => {
    const sessionId = 'rekey-session';
    const encKey = new Uint8Array(32).fill(5);
    const macKey = new Uint8Array(32).fill(9);
    storeSession(sessionId, encKey, macKey);

    // Authenticate + perform the rekey.
    const { n, requestMeta } = signed(macKey, 'POST', rekeyUrl);
    const req = new Request(rekeyUrl, {
      method: 'POST',
      headers: {
        'X-Nen-Session': sessionId,
        'X-Nen-Timestamp': requestMeta.timestamp,
        'X-Nen-Nonce': n,
        'X-Nen-Signature': requestMeta.signature,
      },
    });
    const res = await handleRekey(req);
    expect(res.status).toBe(200);

    // Server advanced to k' = HKDF(k, "nen/v3 ratchet") for both keys.
    const nextEnc = nenCrypto.nen_ratchet_key(encKey);
    const nextMac = nenCrypto.nen_ratchet_key(macKey);
    const stored = await getSession(sessionId);
    expect(Array.from(stored!.encKey)).toEqual(Array.from(nextEnc));
    expect(Array.from(stored!.macKey)).toEqual(Array.from(nextMac));

    // A request signed with the OLD macKey is now rejected (forward secrecy).
    const stale = signed(macKey, 'GET', 'http://localhost/api/data');
    await expect(
      verifyRequest(sessionId, stale.n, stale.requestMeta),
    ).rejects.toMatchObject({ code: 'ISO-3002' });

    // A request signed with the ratcheted macKey authenticates, and the
    // ratcheted encKey decrypts a body sealed under it.
    const fresh = signed(nextMac, 'POST', 'http://localhost/api/data');
    const session = await verifyRequest(sessionId, fresh.n, fresh.requestMeta);
    const ct = nenCrypto.nen_to_base64(
      nenCrypto.nen_encrypt(nextEnc, nenCrypto.nen_from_base64(fresh.n), new TextEncoder().encode('{"ok":1}')),
    );
    expect(new TextDecoder().decode(decryptBody(session, ct, fresh.n))).toBe('{"ok":1}');
  });

  test('rekey with no/invalid signature is rejected (not advanced)', async () => {
    const sessionId = 'rekey-noauth';
    storeSession(sessionId, new Uint8Array(32).fill(1), new Uint8Array(32).fill(2));
    const req = new Request(rekeyUrl, {
      method: 'POST',
      headers: { 'X-Nen-Session': sessionId, 'X-Nen-Nonce': 'AAAA' },
    });
    const res = await handleRekey(req);
    expect(res.status).toBe(401); // ISO-3001 (no signature)
    // keys unchanged
    const stored = await getSession(sessionId);
    expect(Array.from(stored!.macKey)).toEqual(Array.from(new Uint8Array(32).fill(2)));
  });
});

describe('T7 — compliance attestation', () => {
  afterEach(() => {
    (setServerIdentity as any)(new Uint8Array(0), new Uint8Array(0));
  });

  test('issues a signed attestation that verifies, and rejects tampering', () => {
    const id = nenCrypto.nen_generate_signing_keypair();
    setServerIdentity(id.secret_key, id.public_key);

    const { attestation, signature, publicKey } = issueAttestation({
      endpoint: 'https://app.example.com/api/secure',
      securityMode: 'hybrid',
      from: '2026-01-01T00:00:00Z',
      to: '2026-06-12T00:00:00Z',
    });

    expect(attestation.protocol).toBe('NEN-PROTOCOL-V3');
    expect(attestation.suite).toContain('ML-KEM-768');
    expect(verifyAttestation(attestation, signature, publicKey)).toBe(true);

    // Tamper a field → verification fails.
    const tampered: NenAttestation = { ...attestation, endpoint: 'https://evil.example.com' };
    expect(verifyAttestation(tampered, signature, publicKey)).toBe(false);

    // Wrong public key → fails.
    const attacker = nenCrypto.nen_generate_signing_keypair();
    expect(verifyAttestation(attestation, signature, nenCrypto.nen_to_base64(attacker.public_key))).toBe(false);
  });

  test('issuing without a server identity throws', () => {
    expect(() => issueAttestation({ endpoint: 'x' })).toThrow();
  });
});
