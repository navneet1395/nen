import * as isogenyCrypto from 'core-crypto';
import { storeSession } from '../store';
import { decryptPayload } from '../middleware';
import { withIsogeny } from '../wrapper';

// Mock Web Crypto for the Node environment (only randomUUID is needed here)
if (!globalThis.crypto) {
  const crypto = require('crypto');
  globalThis.crypto = {
    randomUUID: () => crypto.randomUUID(),
  } as any;
}

/**
 * Regression tests for the authentication-downgrade bypass described in
 * `Ideation Notes/implementation_plan_1.0.0.md` §1.1.
 *
 * Every session is issued an hmacKey at handshake, so the server must always
 * require a valid signature + in-window timestamp. An attacker holding a valid
 * session ID must NOT be able to skip HMAC auth (and the replay window) by
 * simply omitting the X-Isogeny-Signature / X-Isogeny-Timestamp headers.
 */
describe('Per-request authentication is mandatory (downgrade bypass)', () => {
  const sessionId = 'auth-sig-session';
  const hmacKey = new Uint8Array(32).fill(7);
  const sharedSecret = new Uint8Array(32).fill(1);

  // A parseable (but cryptographically meaningless) payload. The signature and
  // timestamp checks run before decryption is ever attempted, so the actual
  // ciphertext content is irrelevant for these tests.
  const n = isogenyCrypto.isogeny_to_base64(new Uint8Array([1, 2, 3, 4]));
  const ct = isogenyCrypto.isogeny_to_base64(new Uint8Array([5, 6, 7, 8]));
  const url = 'http://localhost/api/test';
  const method = 'POST';

  beforeEach(() => {
    storeSession(sessionId, sharedSecret, hmacKey);
  });

  test('rejects a request with a valid session but no signature header', async () => {
    // ISO-3001 AUTH_SIGNATURE_MISSING — the downgrade-bypass guard.
    await expect(
      decryptPayload(
        sessionId,
        { ct, n },
        { method, url, timestamp: String(Date.now()), signature: '' }
      )
    ).rejects.toMatchObject({ code: 'ISO-3001' });
  });

  test('rejects a request with no request metadata at all', async () => {
    await expect(decryptPayload(sessionId, { ct, n })).rejects.toMatchObject({
      code: 'ISO-3001',
    });
  });

  test('rejects a request with a stale (>30s) timestamp', async () => {
    const timestamp = String(Date.now() - 60_000); // 60s in the past
    const canonical = `${method}\n/api/test\n${timestamp}\n${n}`;
    const signature = isogenyCrypto.isogeny_to_base64(
      isogenyCrypto.isogeny_hmac_sign(hmacKey, new TextEncoder().encode(canonical))
    );

    // ISO-3003 AUTH_TIMESTAMP_OUT_OF_WINDOW
    await expect(
      decryptPayload(sessionId, { ct, n }, { method, url, timestamp, signature })
    ).rejects.toMatchObject({ code: 'ISO-3003' });
  });

  test('rejects a forged signature even with a fresh timestamp', async () => {
    const timestamp = String(Date.now());
    const signature = isogenyCrypto.isogeny_to_base64(new Uint8Array(32).fill(9));

    // ISO-3002 AUTH_SIGNATURE_INVALID
    await expect(
      decryptPayload(sessionId, { ct, n }, { method, url, timestamp, signature })
    ).rejects.toMatchObject({ code: 'ISO-3002' });
  });

  test('legacy strict=false mode skips the signature requirement', async () => {
    // Decryption still fails on the bogus ciphertext (returns null), but the
    // call must NOT throw an authentication error when strict mode is disabled.
    await expect(
      decryptPayload(
        sessionId,
        { ct, n },
        { method, url, timestamp: String(Date.now()), signature: '' },
        false
      )
    ).resolves.toBeNull();
  });

  test('withIsogeny returns 401 for a valid session with no signature header', async () => {
    const handler = withIsogeny(async () => ({ ok: true }));
    const req = new Request(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Isogeny-Session': sessionId,
      },
      body: JSON.stringify({ ct, n }),
    });

    const res = await handler(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    // Coded error body: { error: { code, message } } — see ERROR_CODES.md.
    expect(body.error.code).toBe('ISO-3001');
  });
});
