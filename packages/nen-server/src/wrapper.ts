import { decryptPayload, encryptPayload } from './middleware';
import { NenError } from './errors';

/**
 * A Next.js App Router Route Handler wrapper.
 * Intercepts POST/PUT requests, decrypts the Nen PQC payload,
 * passes the decrypted JSON to the user's handler, and then encrypts
 * the JSON response before sending it back.
 *
 * @param handler The user's route handler function
 * @param options.strict When true (the default), a valid HMAC signature and an
 *   in-window timestamp are mandatory for every session that was issued an
 *   hmacKey at handshake. Set to false ONLY to support explicitly opted-in
 *   legacy clients that cannot sign requests — doing so disables per-request
 *   authentication and the timestamp replay window.
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

      // Read encrypted body (base64-only wire format: { ct, n })
      const encryptedData = await req.json();
      if (!encryptedData.ct || !encryptedData.n) {
        return new NenError('WIRE_INVALID_PAYLOAD_FORMAT').toResponse();
      }

      // Collect request metadata for HMAC verification
      const requestMeta = {
        method: req.method,
        url: req.url,
        timestamp: req.headers.get('X-Nen-Timestamp') || '',
        signature: req.headers.get('X-Nen-Signature') || ''
      };

      // Decrypt (auth/session/replay failures throw coded NenErrors)
      const decryptedBytes = await decryptPayload(sessionId, encryptedData, requestMeta, strict);
      if (!decryptedBytes) {
        return new NenError('CRYPTO_DECRYPT_FAILED').toResponse();
      }

      // Parse decrypted plaintext to JSON
      const plaintextString = new TextDecoder().decode(decryptedBytes);
      let decryptedBody;
      try {
        decryptedBody = JSON.parse(plaintextString);
      } catch (e) {
        return new NenError('CRYPTO_PAYLOAD_NOT_JSON').toResponse();
      }

      // Execute user handler
      const result = await handler(req, decryptedBody);

      // Serialize response to JSON
      const responseString = JSON.stringify(result);
      const responseBytes = new TextEncoder().encode(responseString);

      // Encrypt response
      const encryptedResponse = await encryptPayload(sessionId, responseBytes);

      // Return encrypted JSON
      return new Response(JSON.stringify(encryptedResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err: any) {
      // Every Nen failure is a coded NenError; anything else becomes
      // ISO-9000 (500). The safe { code, message } body goes on the wire and the
      // precise diagnosis is logged — see ERROR_CODES.md.
      return NenError.from(err).toResponse();
    }
  };
}
