import * as nenCrypto from '@withnen/core-crypto';
import { storeSession } from '../store';
import { verifyRequest } from '../middleware';
import { withNen } from '../wrapper';

// Mock Web Crypto for the Node environment (only randomUUID is needed here)
if (!globalThis.crypto) {
  const crypto = require('crypto');
  globalThis.crypto = {
    randomUUID: () => crypto.randomUUID(),
  } as any;
}

/**
 * Regression tests for the authentication-downgrade bypass.
 *
 * Every session has a derived macKey, so the server must always require a valid
 * signature + in-window timestamp. An attacker holding a valid session ID must
 * NOT be able to skip HMAC auth (and the replay window) by simply omitting the
 * X-Nen-Signature / X-Nen-Timestamp headers.
 *
 * Under NEN-PROTOCOL-V2+ this is enforced by `verifyRequest`, which runs for every
 * method — the per-request nonce travels in the X-Nen-Nonce header.
 */
describe('Per-request authentication is mandatory (downgrade bypass)', () => {
  const sessionId = 'auth-sig-session';
  const macKey = new Uint8Array(32).fill(7);
  const encKey = new Uint8Array(32).fill(1);

  // A per-request nonce (base64). verifyRequest never decrypts, so its value just
  // has to be a stable, unique-per-test string for the signature + replay checks.
  const n = nenCrypto.nen_to_base64(nenCrypto.nen_generate_nonce());
  const url = 'http://localhost/api/test';
  const path = '/api/test';
  const method = 'POST';

  beforeEach(() => {
    storeSession(sessionId, encKey, macKey);
  });

  test('rejects a request with a valid session but no signature header', async () => {
    // ISO-3001 AUTH_SIGNATURE_MISSING — the downgrade-bypass guard.
    await expect(
      verifyRequest(sessionId, n, { method, url, timestamp: String(Date.now()), signature: '' })
    ).rejects.toMatchObject({ code: 'ISO-3001' });
  });

  test('rejects a request with no request metadata at all', async () => {
    await expect(verifyRequest(sessionId, n, undefined)).rejects.toMatchObject({
      code: 'ISO-3001',
    });
  });

  test('rejects a request missing the X-Nen-Nonce value', async () => {
    // ISO-3005 AUTH_NONCE_MISSING — the per-request nonce is mandatory.
    await expect(
      verifyRequest(sessionId, null, { method, url, timestamp: String(Date.now()), signature: 'x' })
    ).rejects.toMatchObject({ code: 'ISO-3005' });
  });

  test('rejects a request with a stale (>30s) timestamp', async () => {
    const timestamp = String(Date.now() - 60_000); // 60s in the past
    const canonical = `${method}\n${path}\n${timestamp}\n${n}`;
    const signature = nenCrypto.nen_to_base64(
      nenCrypto.nen_hmac_sign(macKey, new TextEncoder().encode(canonical))
    );

    // ISO-3003 AUTH_TIMESTAMP_OUT_OF_WINDOW
    await expect(
      verifyRequest(sessionId, n, { method, url, timestamp, signature })
    ).rejects.toMatchObject({ code: 'ISO-3003' });
  });

  test('rejects a forged signature even with a fresh timestamp', async () => {
    const timestamp = String(Date.now());
    const signature = nenCrypto.nen_to_base64(new Uint8Array(32).fill(9));

    // ISO-3002 AUTH_SIGNATURE_INVALID
    await expect(
      verifyRequest(sessionId, n, { method, url, timestamp, signature })
    ).rejects.toMatchObject({ code: 'ISO-3002' });
  });

  test('accepts a correctly signed request', async () => {
    const nonce = nenCrypto.nen_to_base64(nenCrypto.nen_generate_nonce());
    const timestamp = String(Date.now());
    const canonical = `${method}\n${path}\n${timestamp}\n${nonce}`;
    const signature = nenCrypto.nen_to_base64(
      nenCrypto.nen_hmac_sign(macKey, new TextEncoder().encode(canonical))
    );

    const session = await verifyRequest(sessionId, nonce, { method, url, timestamp, signature });
    expect(session.encKey).toEqual(encKey);
  });

  test('legacy strict=false mode skips the signature requirement', async () => {
    // No signature, but strict=false → must NOT throw an auth error; returns the
    // session. (Decryption of any body happens separately, in decryptBody.)
    const nonce = nenCrypto.nen_to_base64(nenCrypto.nen_generate_nonce());
    await expect(
      verifyRequest(
        sessionId,
        nonce,
        { method, url, timestamp: String(Date.now()), signature: '' },
        false
      )
    ).resolves.toMatchObject({ macKey });
  });

  test('withNen returns 401 for a valid session with no signature header', async () => {
    const handler = withNen(async () => ({ ok: true }));
    const nonce = nenCrypto.nen_to_base64(nenCrypto.nen_generate_nonce());
    const ct = nenCrypto.nen_to_base64(new Uint8Array([5, 6, 7, 8]));
    const req = new Request(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Nen-Session': sessionId,
        'X-Nen-Nonce': nonce,
      },
      body: JSON.stringify({ ct }),
    });

    const res = await handler(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    // Coded error body: { error: { code, message } } — see ERROR_CODES.md.
    expect(body.error.code).toBe('ISO-3001');
  });
});
