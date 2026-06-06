import { decryptPayload } from './middleware';
import * as nenCrypto from 'core-crypto';
import { getSession } from './store';
import { NenError } from './errors';

function xorNonce(baseNonce: Uint8Array, index: number): Uint8Array {
  const nonce = new Uint8Array(baseNonce);
  const dataView = new DataView(nonce.buffer);
  const current = dataView.getUint32(8, true); // little-endian
  dataView.setUint32(8, current ^ index, true);
  return nonce;
}

/**
 * A Next.js App Router Route Handler wrapper for streaming responses.
 * 
 * Intercepts requests, decrypts the Nen PQC payload,
 * passes the decrypted JSON to the user's handler, and then encrypts
 * the resulting ReadableStream or AsyncIterable chunk by chunk before sending it back.
 *
 * @param handler The user's route handler function that returns a ReadableStream or Response
 */
export function withNenStream(handler: (req: Request, body: any) => Promise<ReadableStream | Response | AsyncIterable<any>> | ReadableStream | Response | AsyncIterable<any>) {
  return async (req: Request) => {
    try {
      const sessionId = req.headers.get('X-Nen-Session');
      if (!sessionId) {
        return new NenError('SESSION_HEADER_MISSING').toResponse();
      }

      // Read encrypted body if present
      let decryptedBody = null;
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        const encryptedData = await req.json();
        if (!encryptedData.ct || !encryptedData.n) {
          return new NenError('WIRE_INVALID_PAYLOAD_FORMAT').toResponse();
        }

        const requestMeta = {
          method: req.method,
          url: req.url,
          timestamp: req.headers.get('X-Nen-Timestamp') || '',
          signature: req.headers.get('X-Nen-Signature') || ''
        };

        const decryptedBytes = await decryptPayload(sessionId, encryptedData, requestMeta);
        if (!decryptedBytes) {
          return new NenError('CRYPTO_DECRYPT_FAILED').toResponse();
        }

        const plaintextString = new TextDecoder().decode(decryptedBytes);
        try {
          decryptedBody = JSON.parse(plaintextString);
        } catch (e) {
          decryptedBody = plaintextString; // fallback to string
        }
      }

      // Execute user handler
      const result = await handler(req, decryptedBody);

      let stream: ReadableStream;
      let headers = new Headers();

      if (result instanceof Response) {
        if (!result.body) {
          return new NenError('INTERNAL', 'Stream handler Response had no body').toResponse();
        }
        stream = result.body;
        result.headers.forEach((v, k) => headers.set(k, v));
      } else if (result instanceof ReadableStream) {
        stream = result;
      } else if (Symbol.asyncIterator in result) {
        stream = new ReadableStream({
          async start(controller) {
            for await (const chunk of (result as AsyncIterable<any>)) {
              controller.enqueue(chunk);
            }
            controller.close();
          }
        });
      } else {
        return new NenError('INTERNAL', 'Stream handler returned a non-streamable value').toResponse();
      }

      const session = await getSession(sessionId);
      if (!session) {
        return new NenError('SESSION_INVALID_OR_EXPIRED').toResponse();
      }

      const baseNonce = nenCrypto.nen_generate_nonce();
      headers.set('Content-Type', 'text/event-stream');
      headers.set('Cache-Control', 'no-cache');
      headers.set('Connection', 'keep-alive');
      headers.set('X-Nen-Stream-Nonce', nenCrypto.nen_to_base64(baseNonce));

      let chunkIndex = 0;

      // Transform stream to encrypt each chunk and yield SSE format
      const encryptStream = new TransformStream({
        transform(chunk, controller) {
          try {
            // Ensure chunk is Uint8Array
            let chunkBytes: Uint8Array;
            if (typeof chunk === 'string') {
              chunkBytes = new TextEncoder().encode(chunk);
            } else if (chunk instanceof Uint8Array) {
              chunkBytes = chunk;
            } else {
              chunkBytes = new TextEncoder().encode(JSON.stringify(chunk));
            }

            const nonce = xorNonce(baseNonce, chunkIndex);
            const ciphertext = nenCrypto.nen_encrypt(session.sharedSecret, nonce, chunkBytes);
            const base64Ct = nenCrypto.nen_to_base64(ciphertext);
            
            // Format as SSE (Server-Sent Events)
            controller.enqueue(new TextEncoder().encode(`data: ${base64Ct}\n\n`));
            chunkIndex++;
          } catch (e) {
            console.error("Encryption error in stream:", e);
            controller.error(e);
          }
        },
        flush(controller) {
          try {
            const nonce = xorNonce(baseNonce, chunkIndex);
            const ciphertext = nenCrypto.nen_encrypt(session.sharedSecret, nonce, new TextEncoder().encode('__FIN__'));
            const base64Ct = nenCrypto.nen_to_base64(ciphertext);
            controller.enqueue(new TextEncoder().encode(`data: ${base64Ct}\n\n`));
          } catch (e) {
            console.error("Encryption error in stream flush:", e);
          }
        }
      });

      return new Response(stream.pipeThrough(encryptStream), {
        status: 200,
        headers
      });

    } catch (err: any) {
      // Coded NenErrors pass through with their status; anything else → ISO-9000.
      return NenError.from(err).toResponse();
    }
  };
}
