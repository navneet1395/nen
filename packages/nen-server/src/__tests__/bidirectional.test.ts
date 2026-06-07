import * as nenCrypto from 'core-crypto';
import { storeSession } from '../store';
import { withNen } from '../wrapper';
import { withNenStream } from '../stream-wrapper';

// Web Crypto shim for Node (handshake helpers aren't used here, but keep parity).
if (!globalThis.crypto || !(globalThis.crypto as any).getRandomValues) {
  globalThis.crypto = require('crypto').webcrypto as any;
}

/**
 * NEN-PROTOCOL-V2 — bidirectional, method-agnostic payload encryption.
 *
 * Proves the "vice-versa" property: every method is authenticated, request
 * bodies are encrypted when present, and the response is ALWAYS encrypted —
 * including bodyless GET / DELETE / HEAD, which V1 could not serve.
 */

interface SessionMaterial {
  sessionId: string;
  sharedSecret: Uint8Array;
  hmacKey: Uint8Array;
}

function newSession(id: string): SessionMaterial {
  const sharedSecret = new Uint8Array(32);
  crypto.getRandomValues(sharedSecret);
  const hmacKey = new Uint8Array(32);
  crypto.getRandomValues(hmacKey);
  storeSession(id, sharedSecret, hmacKey);
  return { sessionId: id, sharedSecret, hmacKey };
}

/** Build a signed V2 request. Body is encrypted under the header nonce when given. */
function buildRequest(
  s: SessionMaterial,
  method: string,
  url: string,
  plaintext?: string,
  opts: { omitNonce?: boolean; omitSignature?: boolean } = {}
): Request {
  const path = new URL(url).pathname;
  const nonce = nenCrypto.nen_generate_nonce();
  const nonceB64 = nenCrypto.nen_to_base64(nonce);
  const timestamp = String(Date.now());
  const canonical = `${method}\n${path}\n${timestamp}\n${nonceB64}`;
  const signature = nenCrypto.nen_to_base64(
    nenCrypto.nen_hmac_sign(s.hmacKey, new TextEncoder().encode(canonical))
  );

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Nen-Session': s.sessionId,
    'X-Nen-Timestamp': timestamp,
  };
  if (!opts.omitNonce) headers['X-Nen-Nonce'] = nonceB64;
  if (!opts.omitSignature) headers['X-Nen-Signature'] = signature;

  let body: string | undefined;
  if (plaintext !== undefined && method !== 'GET' && method !== 'HEAD') {
    const ct = nenCrypto.nen_encrypt(s.sharedSecret, nonce, new TextEncoder().encode(plaintext));
    body = JSON.stringify({ ct: nenCrypto.nen_to_base64(ct) });
  }
  return new Request(url, { method, headers, body });
}

/** Decrypt a `{ ct, n }` response body back to an object. */
function decryptResponse(s: SessionMaterial, json: { ct: string; n: string }) {
  const ct = nenCrypto.nen_from_base64(json.ct);
  const n = nenCrypto.nen_from_base64(json.n);
  return JSON.parse(new TextDecoder().decode(nenCrypto.nen_decrypt(s.sharedSecret, n, ct)));
}

describe('Bidirectional encryption — non-stream', () => {
  test('encrypted GET: no request body, response IS encrypted', async () => {
    const s = newSession('v2-get');
    const handler = withNen(async (_req, body) => {
      expect(body).toBeNull(); // GET carries no body
      return { ok: true, note: 'secret-read' };
    });

    const res = await handler(buildRequest(s, 'GET', 'http://localhost/api/notes/1'));
    expect(res.status).toBe(200);
    const decoded = decryptResponse(s, await res.json());
    expect(decoded).toEqual({ ok: true, note: 'secret-read' });
  });

  test('encrypted POST: request AND response encrypted (round-trip)', async () => {
    const s = newSession('v2-post');
    const handler = withNen(async (_req, body) => ({ echoed: body }));

    const res = await handler(
      buildRequest(s, 'POST', 'http://localhost/api/notes', JSON.stringify({ title: 'hi' }))
    );
    expect(res.status).toBe(200);
    expect(decryptResponse(s, await res.json())).toEqual({ echoed: { title: 'hi' } });
  });

  test('DELETE: bodyless, authenticated, response encrypted', async () => {
    const s = newSession('v2-delete');
    const handler = withNen(async (_req, body) => {
      expect(body).toBeNull();
      return { ok: true, deleted: true };
    });

    const res = await handler(buildRequest(s, 'DELETE', 'http://localhost/api/notes/1'));
    expect(res.status).toBe(200);
    expect(decryptResponse(s, await res.json())).toEqual({ ok: true, deleted: true });
  });

  test('HEAD: authenticated, no response body, Content-Length present', async () => {
    const s = newSession('v2-head');
    const handler = withNen(async () => ({ ok: true }));

    const res = await handler(buildRequest(s, 'HEAD', 'http://localhost/api/notes/1'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Length')).toBeTruthy();
    expect(await res.text()).toBe(''); // no body per HTTP spec
  });

  test('missing X-Nen-Nonce → 401 ISO-3005', async () => {
    const s = newSession('v2-no-nonce');
    const handler = withNen(async () => ({ ok: true }));

    const res = await handler(
      buildRequest(s, 'GET', 'http://localhost/api/notes/1', undefined, { omitNonce: true })
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe('ISO-3005');
  });

  test('GET with query string still authenticates (pathname-only canonical)', async () => {
    const s = newSession('v2-query');
    const handler = withNen(async () => ({ ok: true }));

    // The signature is computed over the pathname only; a query string must not
    // break verification.
    const res = await handler(buildRequest(s, 'GET', 'http://localhost/api/notes?id=5&q=z'));
    expect(res.status).toBe(200);
    expect(decryptResponse(s, await res.json())).toEqual({ ok: true });
  });
});

describe('Bidirectional encryption — streaming auth (closes the GET hole)', () => {
  async function* tokens() {
    yield 'a';
    yield 'b';
  }

  test('streaming GET with a valid signature streams (200 + stream nonce)', async () => {
    const s = newSession('v2-stream-get');
    const handler = withNenStream(async () => tokens());

    const res = await handler(buildRequest(s, 'GET', 'http://localhost/api/feed'));
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Nen-Stream-Nonce')).toBeTruthy();
  });

  test('streaming GET WITHOUT a signature is rejected 401 (was a silent bypass in V1)', async () => {
    const s = newSession('v2-stream-noauth');
    const handler = withNenStream(async () => tokens());

    const res = await handler(
      buildRequest(s, 'GET', 'http://localhost/api/feed', undefined, { omitSignature: true })
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe('ISO-3001');
  });
});
