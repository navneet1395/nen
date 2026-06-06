import * as isogenyCrypto from 'core-crypto';
import { storeSession, getSession, deleteSession, sessionExists, getSessionStore } from './store';
import { IsogenyError } from './errors';

/**
 * Handles incoming POST requests to /api/isogeny/handshake.
 * Generates a shared secret, stores it, and returns the ciphertext to the client.
 */
export async function handleHandshake(req: Request): Promise<Response> {
  try {
    const body = await req.json();

    // Wire format is base64-only (ISOGENY-PROTOCOL-V1).
    let pkBytes: Uint8Array;
    if (body.pk) {
      pkBytes = isogenyCrypto.isogeny_from_base64(body.pk);
    } else {
      return new IsogenyError('HANDSHAKE_MISSING_PUBLIC_KEY').toResponse();
    }

    // Optional PQC Identity verification (ML-DSA)
    if (body.sigPk && body.sigOfPk) {
      const sigPk = isogenyCrypto.isogeny_from_base64(body.sigPk);
      const sigOfPk = isogenyCrypto.isogeny_from_base64(body.sigOfPk);

      const isValid = isogenyCrypto.isogeny_verify_signature(sigPk, pkBytes, sigOfPk);
      if (!isValid) {
        return new IsogenyError('AUTH_IDENTITY_SIGNATURE_INVALID').toResponse();
      }
    }

    const encap = isogenyCrypto.isogeny_encapsulate(pkBytes);
    
    // Generate a 32-byte HMAC key for per-request authentication
    const hmacKey = crypto.getRandomValues(new Uint8Array(32));

    // Generate unique session ID
    const sessionId = crypto.randomUUID();
    storeSession(sessionId, encap.shared_secret, hmacKey);

    return new Response(JSON.stringify({
      sid: sessionId,
      ct: isogenyCrypto.isogeny_to_base64(encap.ciphertext),
      hmac: isogenyCrypto.isogeny_to_base64(hmacKey)
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return IsogenyError.from(err instanceof IsogenyError ? err : new IsogenyError('HANDSHAKE_FAILED', err?.message)).toResponse();
  }
}

/**
 * Handles explicit session termination (logout).
 * Immediately destroys the shared secret from server memory for Perfect Forward Secrecy.
 */
export async function handleTerminate(req: Request): Promise<Response> {
  const sessionId = req.headers.get('X-Isogeny-Session');
  if (sessionId) {
    deleteSession(sessionId);
  }
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}

/**
 * Handles lightweight session status checks (heartbeats).
 */
export async function handleStatus(req: Request): Promise<Response> {
  const sessionId = req.headers.get('X-Isogeny-Session');
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
  const oldSessionId = req.headers.get('X-Isogeny-Session');
  if (oldSessionId) {
    deleteSession(oldSessionId);
  }
  // Delegate to handleHandshake for the actual key exchange
  return handleHandshake(req);
}

/**
 * Helper to decrypt incoming data from an Isogeny client.
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
    throw new IsogenyError('SESSION_INVALID_OR_EXPIRED');
  }

  // Wire format is base64-only (ISOGENY-PROTOCOL-V1): { ct, n }.
  if (!encryptedData.ct || !encryptedData.n) {
    throw new IsogenyError('WIRE_INVALID_PAYLOAD_FORMAT');
  }
  const ctBytes = isogenyCrypto.isogeny_from_base64(encryptedData.ct);
  const nonceBytes = isogenyCrypto.isogeny_from_base64(encryptedData.n);
  const nonceKey = encryptedData.n; // base64 nonce string is the replay-tracking key

  // HMAC Authentication.
  //
  // Every session is issued an hmacKey at handshake, so when one is present we
  // MUST require a valid signature. Treating the signature as optional would be
  // an authentication-downgrade bypass: an attacker holding a session ID could
  // simply omit the X-Isogeny-Signature / X-Isogeny-Timestamp headers to skip
  // both HMAC verification and the timestamp replay window. `strict` defaults to
  // true and should only be disabled for explicitly opted-in legacy clients.
  const signatureRequired = strict && !!session.hmacKey && session.hmacKey.length > 0;

  if (requestMeta && requestMeta.signature) {
    // Reconstruct canonical string
    const urlObj = new URL(requestMeta.url);
    const canonical = `${requestMeta.method}\n${urlObj.pathname}\n${requestMeta.timestamp}\n${nonceKey}`;
    const canonicalBytes = new TextEncoder().encode(canonical);
    const signatureBytes = isogenyCrypto.isogeny_from_base64(requestMeta.signature);

    if (!isogenyCrypto.isogeny_hmac_verify(session.hmacKey, canonicalBytes, signatureBytes)) {
      throw new IsogenyError('AUTH_SIGNATURE_INVALID');
    }

    // Timestamp replay protection (30 seconds window). This runs whenever a
    // signature is present, and a signature is mandatory whenever required.
    const timestampMs = parseInt(requestMeta.timestamp, 10);
    if (isNaN(timestampMs) || Math.abs(Date.now() - timestampMs) > 30000) {
      throw new IsogenyError('AUTH_TIMESTAMP_OUT_OF_WINDOW');
    }
  } else if (signatureRequired) {
    throw new IsogenyError('AUTH_SIGNATURE_MISSING');
  }

  // Nonce replay protection
  const store = getSessionStore();
  if (store.hasNonce && store.trackNonce) {
    if (await store.hasNonce(sessionId, nonceKey)) {
      throw new IsogenyError('REPLAY_NONCE_REUSED');
    }
    await store.trackNonce(sessionId, nonceKey);
  }

  try {
    return isogenyCrypto.isogeny_decrypt(session.sharedSecret, nonceBytes, ctBytes);
  } catch (e) {
    console.error('Decryption failed', e);
    return null;
  }
}

/**
 * Helper to encrypt outgoing data back to an Isogeny client.
 */
export async function encryptPayload(sessionId: string, plaintext: Uint8Array): Promise<{ ct: string, n: string }> {
  const session = await getSession(sessionId);
  if (!session) {
    throw new IsogenyError('SESSION_INVALID_OR_EXPIRED');
  }

  const nonce = isogenyCrypto.isogeny_generate_nonce();
  const ciphertext = isogenyCrypto.isogeny_encrypt(session.sharedSecret, nonce, plaintext);

  return {
    ct: isogenyCrypto.isogeny_to_base64(ciphertext),
    n: isogenyCrypto.isogeny_to_base64(nonce),
  };
}
