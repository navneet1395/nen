/**
 * Nen Error Codes — the internal diagnostic vocabulary.
 *
 * WHY THIS EXISTS
 * ---------------
 * When something goes wrong inside an Nen-protected request, the failure is
 * almost always in OUR layer (key exchange, HMAC, AEAD, replay, wire format) —
 * not in the developer's frontend or backend logic. The developer should never
 * have to read a stack trace and reverse-engineer the cryptography.
 *
 * So every Nen failure carries a stable `ISO-xxxx` code. The code is what
 * lands in the logs and what the developer pastes to us. Given only the code we
 * know EXACTLY what happened and what to do — the integration code stays clean
 * and the diagnosis stays on our side.
 *
 * CONTRACT
 *   - `code`    : stable, never reused, safe to expose on the wire and in logs.
 *   - `message` : safe, generic, returned to the caller. Leaks no internals.
 *   - `hint`    : the precise internal cause. Logged server-side; NEVER sent on
 *                 the wire. This is the line that tells us the real problem.
 *
 * Canonical human reference: ../../ERROR_CODES.md (single source of truth).
 */

export interface NenErrorSpec {
  /** Stable wire/log code, e.g. "ISO-3001". Never reused. */
  code: string;
  /** Suggested HTTP status for this failure. */
  status: number;
  /** Safe, public-facing message. Returned to the caller; leaks no internals. */
  message: string;
  /** Internal diagnosis for logs/support. Never sent on the wire. */
  hint: string;
}

/**
 * The catalog. Keyed by a readable symbolic name; `.code` is the stable wire code.
 *
 *   1xxx  Handshake / key exchange
 *   2xxx  Session lifecycle
 *   3xxx  Authentication (HMAC, identity, replay window)
 *   4xxx  Cryptography (AEAD encrypt/decrypt, payload shape)
 *   5xxx  Replay / nonce
 *   6xxx  Wire format / encoding
 *   7xxx  Streaming
 *   9xxx  Internal / unknown
 */
export const NEN_ERRORS = {
  // 1xxx — Handshake / key exchange
  HANDSHAKE_MISSING_PUBLIC_KEY: {
    code: 'ISO-1001',
    status: 400,
    message: 'Handshake request was malformed.',
    hint: 'Handshake body contained neither `pk` (base64) nor `publicKey` (array). Client SDK out of date or request was not produced by an Nen client.',
  },
  HANDSHAKE_FAILED: {
    code: 'ISO-1002',
    status: 500,
    message: 'Secure handshake could not be completed.',
    hint: 'ML-KEM encapsulation/decapsulation threw. Usually a malformed or wrong-length public key, or a Wasm load failure.',
  },
  HANDSHAKE_NETWORK: {
    code: 'ISO-1003',
    status: 503,
    message: 'Could not reach the secure handshake endpoint.',
    hint: 'fetch() to /api/nen/handshake failed at the network layer. Wrong serverUrl, server down, or CORS.',
  },
  HANDSHAKE_BAD_RESPONSE: {
    code: 'ISO-1004',
    status: 502,
    message: 'Secure handshake returned an unexpected response.',
    hint: 'Handshake responded non-2xx or with a body missing `sid`/`ct`. The route is likely not wired to handleHandshake().',
  },

  // 2xxx — Session lifecycle
  SESSION_NOT_INITIALIZED: {
    code: 'ISO-2001',
    status: 409,
    message: 'Secure session is not established yet.',
    hint: 'nenFetch/nenStream was called before a successful handshake() (missing sharedSecret/sessionId/hmacKey on the client).',
  },
  SESSION_INVALID_OR_EXPIRED: {
    code: 'ISO-2002',
    status: 401,
    message: 'Secure session is invalid or has expired.',
    hint: 'Server session store had no entry for the supplied X-Nen-Session. Expired by TTL, evicted, or this node never saw the handshake (stateless store needed).',
  },
  SESSION_HEADER_MISSING: {
    code: 'ISO-2003',
    status: 401,
    message: 'Secure session header is missing.',
    hint: 'Request arrived without an X-Nen-Session header. Not produced by an Nen client, or a proxy stripped the header.',
  },

  // 3xxx — Authentication
  AUTH_SIGNATURE_MISSING: {
    code: 'ISO-3001',
    status: 401,
    message: 'Request authentication is missing.',
    hint: 'No X-Nen-Signature on a session that requires HMAC. HMAC is MANDATORY — a request without a signature must be rejected (this is the auth-downgrade guard).',
  },
  AUTH_SIGNATURE_INVALID: {
    code: 'ISO-3002',
    status: 401,
    message: 'Request authentication failed.',
    hint: 'HMAC-SHA256 over METHOD\\nPATH\\nTIMESTAMP\\nNONCE did not match. Tampered request, wrong hmacKey, or canonical-string mismatch between client and server (often a path vs. full-URL difference).',
  },
  AUTH_TIMESTAMP_OUT_OF_WINDOW: {
    code: 'ISO-3003',
    status: 401,
    message: 'Request timestamp is outside the allowed window.',
    hint: 'X-Nen-Timestamp is >30s from server time. Clock skew between client and server, or a replayed/delayed request.',
  },
  AUTH_IDENTITY_SIGNATURE_INVALID: {
    code: 'ISO-3004',
    status: 401,
    message: 'Identity verification failed.',
    hint: 'Optional ML-DSA identity signature over the ephemeral public key did not verify. Wrong identity key, or a MITM at handshake.',
  },

  // 4xxx — Cryptography
  CRYPTO_DECRYPT_FAILED: {
    code: 'ISO-4001',
    status: 400,
    message: 'Payload could not be decrypted.',
    hint: 'ChaCha20-Poly1305 AEAD tag verification failed. Ciphertext/nonce tampered, truncated, or encrypted under a different shared secret.',
  },
  CRYPTO_ENCRYPT_FAILED: {
    code: 'ISO-4002',
    status: 500,
    message: 'Response could not be encrypted.',
    hint: 'AEAD encryption threw while sealing the response. Usually a corrupt/missing shared secret on the session.',
  },
  CRYPTO_PAYLOAD_NOT_JSON: {
    code: 'ISO-4003',
    status: 400,
    message: 'Decrypted payload was not valid JSON.',
    hint: 'Decryption succeeded but the plaintext did not JSON.parse. The client encrypted a non-JSON body, or content-type mismatch.',
  },

  // 5xxx — Replay / nonce
  REPLAY_NONCE_REUSED: {
    code: 'ISO-5001',
    status: 409,
    message: 'Request was rejected as a replay.',
    hint: 'This nonce was already seen for this session. Legitimate retry of an identical signed request, or an actual replay attack.',
  },

  // 6xxx — Wire format / encoding
  WIRE_INVALID_PAYLOAD_FORMAT: {
    code: 'ISO-6001',
    status: 400,
    message: 'Encrypted payload format is invalid.',
    hint: 'Body was missing the (ct, n) base64 pair. Not an Nen payload, or a corrupted/truncated body.',
  },
  WIRE_DECODE_FAILED: {
    code: 'ISO-6002',
    status: 400,
    message: 'Encrypted payload could not be decoded.',
    hint: 'base64 decode of ct/n/pk failed. Truncated by a proxy, or non-base64 data in a base64 field.',
  },

  // 7xxx — Streaming
  STREAM_MISSING_NONCE_HEADER: {
    code: 'ISO-7001',
    status: 502,
    message: 'Encrypted stream is missing its nonce header.',
    hint: 'Stream response had no X-Nen-Stream-Nonce. The server route did not use withNenStream(), or a proxy stripped the header.',
  },
  STREAM_REQUEST_FAILED: {
    code: 'ISO-7002',
    status: 502,
    message: 'Encrypted stream request failed.',
    hint: 'Stream response was non-ok or had no body. Upstream handler errored before streaming began.',
  },

  // 9xxx — Internal
  INTERNAL: {
    code: 'ISO-9000',
    status: 500,
    message: 'An internal Nen error occurred.',
    hint: 'Unclassified failure wrapped by NenError.from(). See the attached detail for the original error.',
  },
} satisfies Record<string, NenErrorSpec>;

export type NenErrorName = keyof typeof NEN_ERRORS;

/** Reverse lookup: given a code from a log/support ticket, find its spec. */
export function describeNenCode(code: string): NenErrorSpec | undefined {
  return Object.values(NEN_ERRORS).find((s) => s.code === code);
}

/**
 * A coded, self-describing Nen failure.
 *
 *   throw new NenError('AUTH_SIGNATURE_MISSING');
 *   ...
 *   } catch (e) { return NenError.from(e).toResponse(); }
 */
export class NenError extends Error {
  /** Stable code, e.g. "ISO-3001". */
  readonly code: string;
  /** Suggested HTTP status. */
  readonly status: number;
  /** Internal diagnosis. Logged, never sent on the wire. */
  readonly hint: string;
  /** Optional runtime detail (e.g. an upstream error message). Logged only. */
  readonly detail?: string;

  constructor(name: NenErrorName, detail?: string) {
    const spec = NEN_ERRORS[name];
    super(spec.message);
    this.name = 'NenError';
    this.code = spec.code;
    this.status = spec.status;
    this.hint = spec.hint;
    this.detail = detail;
  }

  /** Wrap any thrown value as a coded error (unknown → ISO-9000). */
  static from(err: unknown): NenError {
    if (err instanceof NenError) return err;
    const msg = err instanceof Error ? err.message : String(err);
    return new NenError('INTERNAL', msg);
  }

  /**
   * The safe wire body — code + public message ONLY. The hint is never included.
   * The caller's frontend/backend can surface `code` for support without ever
   * touching crypto internals.
   */
  toBody(): { error: { code: string; message: string } } {
    return { error: { code: this.code, message: this.message } };
  }

  /**
   * Structured single-line diagnostic log. This is the line we read to diagnose:
   *   [Nen] ISO-3001 (401) AUTH_SIGNATURE_MISSING: <hint> | detail=<detail>
   */
  log(logger: Pick<Console, 'error'> = console): void {
    const base = `[Nen] ${this.code} (${this.status}): ${this.hint}`;
    logger.error(this.detail ? `${base} | detail=${this.detail}` : base);
  }

  /** Build a JSON Response (server). Logs the diagnosis as a side effect. */
  toResponse(): Response {
    this.log();
    return new Response(JSON.stringify(this.toBody()), {
      status: this.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
