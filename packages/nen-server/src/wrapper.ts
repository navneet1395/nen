import { verifyRequest, decryptBody, encryptResponse } from './middleware';
import { NenError } from './errors';

/**
 * A Next.js App Router Route Handler wrapper (NEN-PROTOCOL-V2).
 *
 * Works for **every** HTTP method. Encryption is symmetric and method-agnostic:
 *
 *   - Every request is authenticated (HMAC + timestamp window + nonce replay),
 *     with the per-request nonce read from the `X-Nen-Nonce` header — so bodyless
 *     methods (GET / HEAD / DELETE) are authenticated too.
 *   - A request body is decrypted **iff** one is present (`{ ct }`).
 *   - The handler's return value is **always** encrypted back to the client
 *     (`{ ct, n }`) — if a payload goes encrypted, the payload that comes back is
 *     encrypted too.
 *   - `HEAD` is authenticated and the handler runs, but the response carries no
 *     body (per HTTP spec); a `Content-Length` header reflects the size the
 *     encrypted body would have had.
 *
 * @param handler Receives `(req, body)`. `body` is the decrypted JSON for
 *   body-carrying requests, or `null` for bodyless ones (read query/path from `req`).
 * @param options.strict When true (default), a valid HMAC signature and an
 *   in-window timestamp are mandatory for every session. Set false ONLY for
 *   explicitly opted-in legacy clients that cannot sign requests.
 */
export function withNen(
  handler: (req: Request, body: any) => Promise<any> | any,
  options: { strict?: boolean } = {}
) {
  const strict = options.strict ?? true;
  return async (req: Request) => {
    try {
      const sessionId = req.headers.get('X-Nen-Session');
      if (!sessionId) {
        return new NenError('SESSION_HEADER_MISSING').toResponse();
      }

      const method = req.method.toUpperCase();
      const nonceB64 = req.headers.get('X-Nen-Nonce');

      // Authenticate the request (all methods). Throws coded NenErrors;
      // returns the resolved session so we only hit the store once.
      const session = await verifyRequest(
        sessionId,
        nonceB64,
        {
          method,
          url: req.url,
          timestamp: req.headers.get('X-Nen-Timestamp') || '',
          signature: req.headers.get('X-Nen-Signature') || '',
        },
        strict
      );

      // Decrypt the request body only when one is present. GET/HEAD never carry
      // a body; other methods may send an encrypted `{ ct }` or nothing at all.
      let decryptedBody: any = null;
      if (method !== 'GET' && method !== 'HEAD') {
        const raw = await req.text();
        if (raw && raw.length > 0) {
          let parsed: { ct?: string };
          try {
            parsed = JSON.parse(raw);
          } catch {
            return new NenError('WIRE_INVALID_PAYLOAD_FORMAT').toResponse();
          }
          if (!parsed.ct) {
            return new NenError('WIRE_INVALID_PAYLOAD_FORMAT').toResponse();
          }
          // nonceB64 is guaranteed non-null here (verifyRequest enforces it).
          const decryptedBytes = decryptBody(session, parsed.ct, nonceB64 as string);
          try {
            decryptedBody = JSON.parse(new TextDecoder().decode(decryptedBytes));
          } catch {
            return new NenError('CRYPTO_PAYLOAD_NOT_JSON').toResponse();
          }
        }
      }

      // Execute the user handler.
      const result = await handler(req, decryptedBody);

      // Always encrypt the response payload.
      const responseBytes = new TextEncoder().encode(JSON.stringify(result));
      const encrypted = encryptResponse(session, responseBytes);
      const bodyString = JSON.stringify(encrypted);

      // HEAD must not return a body — send metadata headers only.
      if (method === 'HEAD') {
        return new Response(null, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': String(new TextEncoder().encode(bodyString).length),
          },
        });
      }

      return new Response(bodyString, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      // Every Nen failure is a coded NenError; anything else becomes ISO-9000.
      // The safe { code, message } body goes on the wire; the precise diagnosis
      // is logged — see ERROR_CODES.md.
      return NenError.from(err).toResponse();
    }
  };
}
