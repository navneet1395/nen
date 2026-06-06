import * as nenCrypto from 'core-crypto';
import { storeSession, getSession, deleteSession, sessionExists, getSessionStore } from './store';
import { NenError } from './errors';

/**
 * Handles incoming POST requests to /api/nen/handshake.
 * Generates a shared secret, stores it, and returns the ciphertext to the client.
 */
export async function handleHandshake(req: Request): Promise<Response> {
  try {
    const body = await req.json();

    // Wire format is base64-only (NEN-PROTOCOL-V1).
    let pkBytes: Uint8Array;
    if (body.pk) {
      pkBytes = nenCrypto.nen_from_base64(body.pk);
    } else {
      return new NenError('HANDSHAKE_MISSING_PUBLIC_KEY').toResponse();
    }

    // Optional PQC Identity verification (ML-DSA)
    if (body.sigPk && body.sigOfPk) {
      const sigPk = nenCrypto.nen_from_base64(body.sigPk);
      const sigOfPk = nenCrypto.nen_from_base64(body.sigOfPk);

      const isValid = nenCrypto.nen_verify_signature(sigPk, pkBytes, sigOfPk);
      if (!isValid) {
        return new NenError('AUTH_IDENTITY_SIGNATURE_INVALID').toResponse();
      }
    }

    const encap = nenCrypto.nen_encapsulate(pkBytes);
    
    // Generate a 32-byte HMAC key for per-request authentication
    const hmacKey = crypto.getRandomValues(new Uint8Array(32));

    // Generate unique session ID
    const sessionId = crypto.randomUUID();
    storeSession(sessionId, encap.shared_secret, hmacKey);

    return new Response(JSON.stringify({
      sid: sessionId,
      ct: nenCrypto.nen_to_base64(encap.ciphertext),
      hmac: nenCrypto.nen_to_base64(hmacKey)
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return NenError.from(err instanceof NenError ? err : new NenError('HANDSHAKE_FAILED', err?.message)).toResponse();
  }
}

/**
 * Handles explicit session termination (logout).
 * Immediately destroys the shared secret from server memory for Perfect Forward Secrecy.
 */
export async function handleTerminate(req: Request): Promise<Response> {
  const sessionId = req.headers.get('X-Nen-Session');
  if (sessionId) {
    deleteSession(sessionId);
  }
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}

/**
 * Handles lightweight session status checks (heartbeats).
 */
export async function handleStatus(req: Request): Promise<Response> {
  const sessionId = req.headers.get('X-Nen-Session');
  if (!sessionId || !sessionExists(sessionId)) {
    return new Response(JSON.stringify({ valid: false }), { status: 401 });
  }
  return new Response(JSON.stringify({ valid: true }), { status: 200 });
}

/**
 * Handles key rotation by performing a fresh handshake.
 * The old session is destroyed and a new session with a new shared secret is created.
 */
export async function handleRotate(req: Request): Promise<Response> {
  const oldSessionId = req.headers.get('X-Nen-Session');
  if (oldSessionId) {
    deleteSession(oldSessionId);
  }
  // Delegate to handleHandshake for the actual key exchange
  return handleHandshake(req);
}

/**
 * Helper to decrypt incoming data from an Nen client.
 * Also performs nonce replay detection if the session store supports it.
 */
export async function decryptPayload(
  sessionId: string,
  encryptedData: { ct?: string, n?: string },
  requestMeta?: { method: string, url: string, timestamp: string, signature: string },
  strict: boolean = true
): Promise<Uint8Array | null> {
  const session = await getSession(sessionId);
  if (!session) {
    throw new NenError('SESSION_INVALID_OR_EXPIRED');
  }

  // Wire format is base64-only (NEN-PROTOCOL-V1): { ct, n }.
  if (!encryptedData.ct || !encryptedData.n) {
    throw new NenError('WIRE_INVALID_PAYLOAD_FORMAT');
  }
  const ctBytes = nenCrypto.nen_from_base64(encryptedData.ct);
  const nonceBytes = nenCrypto.nen_from_base64(encryptedData.n);
  const nonceKey = encryptedData.n; // base64 nonce string is the replay-tracking key

  // HMAC Authentication.
  //
  // Every session is issued an hmacKey at handshake, so when one is present we
  // MUST require a valid signature. Treating the signature as optional would be
  // an authentication-downgrade bypass: an attacker holding a session ID could
  // simply omit the X-Nen-Signature / X-Nen-Timestamp headers to skip
  // both HMAC verification and the timestamp replay window. `strict` defaults to
  // true and should only be disabled for explicitly opted-in legacy clients.
  const signatureRequired = strict && !!session.hmacKey && session.hmacKey.length > 0;

  if (requestMeta && requestMeta.signature) {
    // Reconstruct canonical string
    const urlObj = new URL(requestMeta.url);
    const canonical = `${requestMeta.method}\n${urlObj.pathname}\n${requestMeta.timestamp}\n${nonceKey}`;
    const canonicalBytes = new TextEncoder().encode(canonical);
    const signatureBytes = nenCrypto.nen_from_base64(requestMeta.signature);

    if (!nenCrypto.nen_hmac_verify(session.hmacKey, canonicalBytes, signatureBytes)) {
      throw new NenError('AUTH_SIGNATURE_INVALID');
    }

    // Timestamp replay protection (30 seconds window). This runs whenever a
    // signature is present, and a signature is mandatory whenever required.
    const timestampMs = parseInt(requestMeta.timestamp, 10);
    if (isNaN(timestampMs) || Math.abs(Date.now() - timestampMs) > 30000) {
      throw new NenError('AUTH_TIMESTAMP_OUT_OF_WINDOW');
    }
  } else if (signatureRequired) {
    throw new NenError('AUTH_SIGNATURE_MISSING');
  }

  // Nonce replay protection
  const store = getSessionStore();
  if (store.hasNonce && store.trackNonce) {
    if (await store.hasNonce(sessionId, nonceKey)) {
      throw new NenError('REPLAY_NONCE_REUSED');
    }
    await store.trackNonce(sessionId, nonceKey);
  }

  try {
    return nenCrypto.nen_decrypt(session.sharedSecret, nonceBytes, ctBytes);
  } catch (e) {
    console.error('Decryption failed', e);
    return null;
  }
}

/**
 * Helper to encrypt outgoing data back to an Nen client.
 */
export async function encryptPayload(sessionId: string, plaintext: Uint8Array): Promise<{ ct: string, n: string }> {
  const session = await getSession(sessionId);
  if (!session) {
    throw new NenError('SESSION_INVALID_OR_EXPIRED');
  }

  const nonce = nenCrypto.nen_generate_nonce();
  const ciphertext = nenCrypto.nen_encrypt(session.sharedSecret, nonce, plaintext);

  return {
    ct: nenCrypto.nen_to_base64(ciphertext),
    n: nenCrypto.nen_to_base64(nonce),
  };
}
