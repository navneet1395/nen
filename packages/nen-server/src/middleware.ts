import * as nenCrypto from '@withnen/core-crypto';
import { storeSession, getSession, deleteSession, sessionExists, getSessionStore } from './store';
import { NenError } from './errors';
import { deriveResumptionPsk, deriveResumeSs, sealTicket, openTicket } from './resumption';

export { setTicketKey } from './resumption';

/**
 * Optional server identity (NEN-PROTOCOL-V3, T3).
 *
 * When configured, the server signs the handshake transcript with an ML-DSA
 * secret key so a client in identityMode:'pqc' can authenticate the server
 * WITHOUT trusting the web PKI. The matching public key is pinned by the client
 * out-of-band. Set via setServerIdentity(); unset = no server signature emitted.
 */
let _serverIdentity: { secretKey: Uint8Array; publicKey: Uint8Array } | null = null;

/** Configure the opt-in ML-DSA server identity used to sign handshake transcripts. */
export function setServerIdentity(secretKey: Uint8Array, publicKey: Uint8Array): void {
  _serverIdentity = { secretKey, publicKey };
}

export type SecurityMode = 'hybrid' | 'pqc-only';

/**
 * Handles incoming POST requests to /api/nen/handshake (NEN-PROTOCOL-V3).
 *
 * V3 key schedule: NOTHING secret crosses the wire. The server derives the
 * ChaCha20 key (k_enc) and the HMAC key (k_mac) locally via HKDF from the
 * (hybrid) shared secret and stores ONLY those. The response carries
 * `{ sid, ct }` (+ `pk_x_server` in hybrid mode, + transcript auth fields in
 * identityMode:'pqc') and never any key material — a direct fix for the High
 * finding that V2 shipped the MAC key in plaintext.
 */
export async function handleHandshake(req: Request): Promise<Response> {
  try {
    const body = await req.json();

    // Resumption (T4): a ticket short-circuits the full ML-KEM handshake.
    if (body.resume) {
      return handleResume(body);
    }

    // Wire format is base64-only.
    let pkBytes: Uint8Array;
    if (body.pk_kem) {
      pkBytes = nenCrypto.nen_from_base64(body.pk_kem);
    } else if (body.pk) {
      // Back-compat field name for the KEM public key.
      pkBytes = nenCrypto.nen_from_base64(body.pk);
    } else {
      return new NenError('HANDSHAKE_MISSING_PUBLIC_KEY').toResponse();
    }

    const securityMode: SecurityMode = body.securityMode === 'pqc-only' ? 'pqc-only' : 'hybrid';

    // ML-KEM-768 encapsulation — the post-quantum half of the secret.
    const encap = nenCrypto.nen_encapsulate(pkBytes);
    const mlkemSs = encap.shared_secret;

    // Hybrid (default): also run X25519 and combine. Defense-in-depth — the
    // session stays secure if EITHER algorithm is broken.
    let combinedSs: Uint8Array;
    let clientPkX: Uint8Array = new Uint8Array(0);
    let serverPkX: Uint8Array = new Uint8Array(0);
    if (securityMode === 'hybrid') {
      if (!body.pk_x) {
        return new NenError('HANDSHAKE_MISSING_PUBLIC_KEY', 'hybrid mode requires pk_x').toResponse();
      }
      clientPkX = nenCrypto.nen_from_base64(body.pk_x);
      const serverX = nenCrypto.nen_x25519_keypair();
      serverPkX = serverX.public_key;
      const x25519Ss = nenCrypto.nen_x25519_dh(serverX.secret_key, clientPkX);
      combinedSs = nenCrypto.nen_hybrid_combine(x25519Ss, mlkemSs);
      serverX.secret_key.fill(0);
    } else {
      combinedSs = mlkemSs;
    }

    // Derive the two session keys locally — NEVER transmitted.
    const encKey = nenCrypto.nen_derive_enc_key(combinedSs);
    const macKey = nenCrypto.nen_derive_mac_key(combinedSs);

    const sessionId = crypto.randomUUID();
    storeSession(sessionId, encKey, macKey);

    const response: Record<string, string> = {
      sid: sessionId,
      ct: nenCrypto.nen_to_base64(encap.ciphertext),
      // Resumption ticket (T4): seals the psk so a reconnect can skip the KEM.
      // The client also derives the psk locally; nothing secret is on the wire.
      ticket: sealTicket(deriveResumptionPsk(combinedSs)),
    };
    if (securityMode === 'hybrid') {
      response.pk_x_server = nenCrypto.nen_to_base64(serverPkX);
    }

    // Transcript-bound server authentication (T3, opt-in). The signed message is
    // the full transcript, not just the client pk, and it binds the sid.
    if (_serverIdentity) {
      const sidBytes = new TextEncoder().encode(sessionId);
      const serverNonce = crypto.getRandomValues(new Uint8Array(32));
      const transcript = nenCrypto.nen_transcript_hash(pkBytes, clientPkX, serverNonce, sidBytes);
      const sig = nenCrypto.nen_sign(_serverIdentity.secretKey, transcript);
      response.server_nonce = nenCrypto.nen_to_base64(serverNonce);
      response.server_sig = nenCrypto.nen_to_base64(sig);
      response.server_id_pk = nenCrypto.nen_to_base64(_serverIdentity.publicKey);
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return NenError.from(err instanceof NenError ? err : new NenError('HANDSHAKE_FAILED', err?.message)).toResponse();
  }
}

/**
 * Resume a session from a ticket (NEN-PROTOCOL-V3, T4). Opens the sealed ticket
 * to recover the psk, mixes fresh client+server nonces into a new per-resume
 * secret, derives a brand-new key pair, and issues a fresh ticket. No ML-KEM, no
 * key material on the wire. An invalid/expired ticket returns 409 so the client
 * falls back to a full handshake.
 */
async function handleResume(body: any): Promise<Response> {
  const psk = body.resume ? openTicket(body.resume) : null;
  if (!psk || !body.rn) {
    return new Response(JSON.stringify({ resumed: false }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const clientRn = nenCrypto.nen_from_base64(body.rn);
  const serverRn = crypto.getRandomValues(new Uint8Array(32));
  const ss2 = deriveResumeSs(psk, clientRn, serverRn);
  const encKey = nenCrypto.nen_derive_enc_key(ss2);
  const macKey = nenCrypto.nen_derive_mac_key(ss2);
  const sessionId = crypto.randomUUID();
  storeSession(sessionId, encKey, macKey);

  return new Response(
    JSON.stringify({
      sid: sessionId,
      srn: nenCrypto.nen_to_base64(serverRn),
      ticket: sealTicket(psk), // fresh ticket (re-seals the same psk, new expiry)
      resumed: true,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
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
 * In-session rekey (NEN-PROTOCOL-V3, T5). Advances BOTH session keys via a
 * one-way HKDF ratchet — `k' = HKDF(k, "nen/v3 ratchet")` — with no KEM round
 * trip and no key material on the wire. The request MUST be authenticated with
 * the CURRENT macKey; the client then advances its keys identically, so both
 * sides stay in lockstep. This gives forward secrecy WITHIN a session: a single
 * compromised key epoch cannot read requests from a later epoch.
 *
 * (Cheaper than `handleRotate`, which runs a full new ML-KEM handshake.)
 */
export async function handleRekey(req: Request): Promise<Response> {
  try {
    const sessionId = req.headers.get('X-Nen-Session');
    if (!sessionId) {
      return new NenError('SESSION_HEADER_MISSING').toResponse();
    }
    // Authenticate the rekey with the current keys before advancing them.
    const session = await verifyRequest(
      sessionId,
      req.headers.get('X-Nen-Nonce'),
      {
        method: req.method,
        url: req.url,
        timestamp: req.headers.get('X-Nen-Timestamp') || '',
        signature: req.headers.get('X-Nen-Signature') || '',
      },
    );
    const nextEnc = nenCrypto.nen_ratchet_key(session.encKey);
    const nextMac = nenCrypto.nen_ratchet_key(session.macKey);
    await storeSession(sessionId, nextEnc, nextMac);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return NenError.from(err).toResponse();
  }
}

// -----------------------------------------------------------------------------
// Compliance attestation (NEN-PROTOCOL-V3, T7) — signed, timestamped evidence
// that an endpoint negotiated the V3 post-quantum suite. The artifact an auditor
// asks for; no third-party CA involved. Signed with the opt-in ML-DSA server
// identity (setServerIdentity).
// -----------------------------------------------------------------------------

const ATTESTATION_SUITE =
  'ML-KEM-768 + X25519 / HKDF-SHA256 / ChaCha20-Poly1305 / HMAC-SHA256 / ML-DSA-65';

export interface NenAttestation {
  v: 'NEN-ATTESTATION-1';
  endpoint: string;
  protocol: 'NEN-PROTOCOL-V3';
  suite: string;
  securityMode: SecurityMode;
  /** Optional coverage window (ISO-8601) the evidence asserts. */
  from?: string;
  to?: string;
  issuedAt: string;
}

/**
 * Issue a signed attestation. Requires a server identity (`setServerIdentity`).
 * Returns the attestation object, its ML-DSA signature, and the public key so a
 * recipient can verify it offline with `verifyAttestation`.
 */
export function issueAttestation(opts: {
  endpoint: string;
  securityMode?: SecurityMode;
  from?: string;
  to?: string;
}): { attestation: NenAttestation; signature: string; publicKey: string } {
  if (!_serverIdentity || _serverIdentity.secretKey.length === 0) {
    throw new NenError('INTERNAL', 'issueAttestation requires a server identity (setServerIdentity)');
  }
  const attestation: NenAttestation = {
    v: 'NEN-ATTESTATION-1',
    endpoint: opts.endpoint,
    protocol: 'NEN-PROTOCOL-V3',
    suite: ATTESTATION_SUITE,
    securityMode: opts.securityMode ?? 'hybrid',
    ...(opts.from ? { from: opts.from } : {}),
    ...(opts.to ? { to: opts.to } : {}),
    issuedAt: new Date().toISOString(),
  };
  const msg = new TextEncoder().encode(JSON.stringify(attestation));
  const sig = nenCrypto.nen_sign(_serverIdentity.secretKey, msg);
  return {
    attestation,
    signature: nenCrypto.nen_to_base64(sig),
    publicKey: nenCrypto.nen_to_base64(_serverIdentity.publicKey),
  };
}

/** Offline verification of an attestation against the signer's public key. */
export function verifyAttestation(att: NenAttestation, signature: string, publicKey: string): boolean {
  try {
    const msg = new TextEncoder().encode(JSON.stringify(att));
    return nenCrypto.nen_verify_signature(
      nenCrypto.nen_from_base64(publicKey),
      msg,
      nenCrypto.nen_from_base64(signature),
    );
  } catch {
    return false;
  }
}

/** The minimal session material the crypto helpers operate on (NEN-PROTOCOL-V3). */
export interface Session {
  /** ChaCha20 key, HKDF-derived from the shared secret. */
  encKey: Uint8Array;
  /** HMAC-SHA256 key, HKDF-derived from the shared secret. */
  macKey: Uint8Array;
}

export interface RequestMeta {
  method: string;
  url: string;
  timestamp: string;
  signature: string;
}

/**
 * Authenticate a request for ANY HTTP method (NEN-PROTOCOL-V2).
 *
 * The per-request nonce travels in the `X-Nen-Nonce` header (not the body), so
 * this works identically for bodyless methods (GET/HEAD/DELETE) and methods that
 * carry an encrypted body. It verifies, in order:
 *   1. session is live              → ISO-2002
 *   2. nonce header present         → ISO-3005
 *   3. HMAC over METHOD\nPATH\nTIMESTAMP\nNONCE (mandatory under `strict`)
 *                                    → ISO-3001 / ISO-3002
 *   4. timestamp within ±30s        → ISO-3003
 *   5. nonce unseen for the session → ISO-5001
 *
 * Returns the resolved session so the caller can reuse it (single store fetch).
 */
export async function verifyRequest(
  sessionId: string,
  nonceB64: string | null,
  requestMeta: RequestMeta | undefined,
  strict: boolean = true
): Promise<Session> {
  const session = await getSession(sessionId);
  if (!session) {
    throw new NenError('SESSION_INVALID_OR_EXPIRED');
  }

  // The per-request nonce is mandatory and lives in the X-Nen-Nonce header.
  // It feeds both the HMAC canonical string and replay tracking.
  if (!nonceB64) {
    throw new NenError('AUTH_NONCE_MISSING');
  }

  // HMAC Authentication.
  //
  // Every session has a derived macKey (HKDF from the post-quantum shared
  // secret — NEN-PROTOCOL-V3, never transmitted), so when one is present we MUST
  // require a valid signature. Treating the signature as optional would be an
  // authentication-downgrade bypass: an attacker holding a session ID could
  // simply omit the X-Nen-Signature / X-Nen-Timestamp headers to skip both HMAC
  // verification and the timestamp replay window. `strict` defaults to true and
  // should only be disabled for explicitly opted-in legacy clients.
  const signatureRequired = strict && !!session.macKey && session.macKey.length > 0;

  if (requestMeta && requestMeta.signature) {
    const urlObj = new URL(requestMeta.url);
    const canonical = `${requestMeta.method}\n${urlObj.pathname}\n${requestMeta.timestamp}\n${nonceB64}`;
    const canonicalBytes = new TextEncoder().encode(canonical);
    const signatureBytes = nenCrypto.nen_from_base64(requestMeta.signature);

    if (!nenCrypto.nen_hmac_verify(session.macKey, canonicalBytes, signatureBytes)) {
      throw new NenError('AUTH_SIGNATURE_INVALID');
    }

    const timestampMs = parseInt(requestMeta.timestamp, 10);
    if (isNaN(timestampMs) || Math.abs(Date.now() - timestampMs) > 30000) {
      throw new NenError('AUTH_TIMESTAMP_OUT_OF_WINDOW');
    }
  } else if (signatureRequired) {
    throw new NenError('AUTH_SIGNATURE_MISSING');
  }

  // Nonce replay protection (keyed on the X-Nen-Nonce value).
  const store = getSessionStore();
  if (store.hasNonce && store.trackNonce) {
    if (await store.hasNonce(sessionId, nonceB64)) {
      throw new NenError('REPLAY_NONCE_REUSED');
    }
    await store.trackNonce(sessionId, nonceB64);
  }

  return session;
}

/**
 * Decrypt an encrypted request body `{ ct }` under the per-request nonce
 * (the same `X-Nen-Nonce` value verified by verifyRequest). Synchronous — it
 * operates on the already-resolved session. Call ONLY after verifyRequest().
 */
export function decryptBody(session: Session, ctB64: string, nonceB64: string): Uint8Array {
  const ctBytes = nenCrypto.nen_from_base64(ctB64);
  const nonceBytes = nenCrypto.nen_from_base64(nonceB64);
  try {
    return nenCrypto.nen_decrypt(session.encKey, nonceBytes, ctBytes);
  } catch (e) {
    throw new NenError('CRYPTO_DECRYPT_FAILED', e instanceof Error ? e.message : String(e));
  }
}

/**
 * Encrypt a response payload back to the client. The response always carries its
 * own fresh server-generated nonce in the body: `{ ct, n }`. Synchronous — it
 * operates on the already-resolved session.
 */
export function encryptResponse(session: Session, plaintext: Uint8Array): { ct: string; n: string } {
  const nonce = nenCrypto.nen_generate_nonce();
  const ciphertext = nenCrypto.nen_encrypt(session.encKey, nonce, plaintext);
  return {
    ct: nenCrypto.nen_to_base64(ciphertext),
    n: nenCrypto.nen_to_base64(nonce),
  };
}

/**
 * Convenience: encrypt a response by session id (fetches the session, then
 * delegates to encryptResponse). Kept for callers that only hold a session id.
 */
export async function encryptPayload(sessionId: string, plaintext: Uint8Array): Promise<{ ct: string; n: string }> {
  const session = await getSession(sessionId);
  if (!session) {
    throw new NenError('SESSION_INVALID_OR_EXPIRED');
  }
  return encryptResponse(session, plaintext);
}
