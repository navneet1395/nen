import * as isogenyCrypto from 'core-crypto';
import { storeSession, getSession, deleteSession, sessionExists } from './store';

// We can use standard Web Crypto for generating session IDs
function generateSessionId() {
  return crypto.randomUUID();
}
/**
 * Handles incoming POST requests to /_isogeny/handshake.
 * Generates a shared secret, stores it, and returns the ciphertext to the client.
 */
export async function handleHandshake(req: Request): Promise<Response> {
  try {
    const body = await req.json();

    if (!body.publicKey || !Array.isArray(body.publicKey)) {
      return new Response(JSON.stringify({ error: 'Invalid publicKey format' }), { status: 400 });
    }

    const pkBytes = new Uint8Array(body.publicKey);
    const encap = isogenyCrypto.isogeny_encapsulate(pkBytes);
    
    // Generate unique session ID
    const sessionId = crypto.randomUUID();
    storeSession(sessionId, encap.shared_secret);

    return new Response(JSON.stringify({
      sessionId,
      ciphertext: Array.from(encap.ciphertext)
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Handshake failed' }), { status: 500 });
  }
}

/**
 * Handles explicit session termination (logout)
 */
export async function handleTerminate(req: Request): Promise<Response> {
  const sessionId = req.headers.get('X-Isogeny-Session');
  if (sessionId) {
    deleteSession(sessionId);
  }
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}

/**
 * Handles lightweight session status checks
 */
export async function handleStatus(req: Request): Promise<Response> {
  const sessionId = req.headers.get('X-Isogeny-Session');
  if (!sessionId || !sessionExists(sessionId)) {
    return new Response(JSON.stringify({ valid: false }), { status: 401 });
  }
  return new Response(JSON.stringify({ valid: true }), { status: 200 });
}

/**
 * Helper to decrypt incoming data from an Isogeny client
 */
export function decryptPayload(sessionId: string, encryptedData: { ciphertext: number[], nonce: number[] }): Uint8Array | null {
  const sharedSecret = getSession(sessionId);
  if (!sharedSecret) {
    throw new Error('Invalid or expired session');
  }

  const nonceBytes = new Uint8Array(encryptedData.nonce);
  const ctBytes = new Uint8Array(encryptedData.ciphertext);

  try {
    return isogenyCrypto.isogeny_decrypt(sharedSecret, nonceBytes, ctBytes);
  } catch (e) {
    console.error('Decryption failed', e);
    return null;
  }
}

/**
 * Helper to encrypt outgoing data back to an Isogeny client
 */
export function encryptPayload(sessionId: string, plaintext: Uint8Array): { ciphertext: number[], nonce: number[] } {
  const sharedSecret = getSession(sessionId);
  if (!sharedSecret) {
    throw new Error('Invalid or expired session');
  }

  const nonce = isogenyCrypto.isogeny_generate_nonce();
  const ciphertext = isogenyCrypto.isogeny_encrypt(sharedSecret, nonce, plaintext);

  return {
    ciphertext: Array.from(ciphertext),
    nonce: Array.from(nonce)
  };
}
