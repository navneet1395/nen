import { decryptPayload, encryptPayload } from './middleware';

/**
 * A Next.js App Router Route Handler wrapper.
 * Intercepts POST/PUT requests, decrypts the Isogeny PQC payload,
 * passes the decrypted JSON to the user's handler, and then encrypts
 * the JSON response before sending it back.
 *
 * @param handler The user's route handler function
 */
export function withIsogeny(handler: (req: Request, body: any) => Promise<any> | any) {
  return async (req: Request) => {
    try {
      const sessionId = req.headers.get('X-Isogeny-Session');
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Missing X-Isogeny-Session header' }), { status: 401 });
      }

      // Read encrypted body
      const encryptedData = await req.json();
      if (!encryptedData.ciphertext || !encryptedData.nonce) {
        return new Response(JSON.stringify({ error: 'Invalid encrypted payload format' }), { status: 400 });
      }

      // Decrypt
      const decryptedBytes = decryptPayload(sessionId, encryptedData);
      if (!decryptedBytes) {
        return new Response(JSON.stringify({ error: 'Decryption failed or session invalid' }), { status: 401 });
      }

      // Parse decrypted plaintext to JSON
      const plaintextString = new TextDecoder().decode(decryptedBytes);
      let decryptedBody;
      try {
        decryptedBody = JSON.parse(plaintextString);
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Decrypted payload is not valid JSON' }), { status: 400 });
      }

      // Execute user handler
      const result = await handler(req, decryptedBody);

      // Serialize response to JSON
      const responseString = JSON.stringify(result);
      const responseBytes = new TextEncoder().encode(responseString);

      // Encrypt response
      const encryptedResponse = encryptPayload(sessionId, responseBytes);

      // Return encrypted JSON
      return new Response(JSON.stringify(encryptedResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err: any) {
      if (err.message === 'Invalid or expired session') {
        return new Response(JSON.stringify({ error: 'Invalid or expired session' }), { status: 401 });
      }
      console.error('Isogeny Wrapper Error:', err);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
  };
}
