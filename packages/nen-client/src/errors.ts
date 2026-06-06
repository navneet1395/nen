/**
 * Nen Error Codes (client mirror).
 *
 * Same diagnostic vocabulary as the server. When a request fails inside the
 * Nen layer, the client throws an `NenError` carrying a stable `ISO-xxxx`
 * code and logs a structured diagnosis. The developer's UI code only ever needs
 * the `code` — it never has to interpret the cryptography.
 *
 * This file is a mirror of the canonical catalog in ../../ERROR_CODES.md.
 * Keep the codes identical to the server's `errors.ts`.
 */

export interface NenErrorSpec {
  code: string;
  status: number;
  message: string;
  hint: string;
}

export const NEN_ERRORS = {
  // 1xxx — Handshake / key exchange
  HANDSHAKE_FAILED: {
    code: 'ISO-1002',
    status: 500,
    message: 'Secure handshake could not be completed.',
    hint: 'ML-KEM key exchange failed locally. Wasm load failure or a malformed server ciphertext.',
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
    hint: 'Handshake responded non-2xx or with a body missing `sid`/`ct`. The server route is likely not wired to handleHandshake().',
  },

  // 2xxx — Session lifecycle
  SESSION_NOT_INITIALIZED: {
    code: 'ISO-2001',
    status: 409,
    message: 'Secure session is not established yet.',
    hint: 'nenfetch/nenstream was called before a successful handshake() (missing sharedSecret/sessionId/hmacKey).',
  },

  // 4xxx — Cryptography
  CRYPTO_DECRYPT_FAILED: {
    code: 'ISO-4001',
    status: 400,
    message: 'Server payload could not be decrypted.',
    hint: 'ChaCha20-Poly1305 AEAD tag verification failed on the response. Tampered/truncated ciphertext or a desynced shared secret (try rotate()).',
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
    hint: 'Stream response was non-ok or had no body. The upstream handler errored before streaming began.',
  },

  // 9xxx — Internal
  INTERNAL: {
    code: 'ISO-9000',
    status: 500,
    message: 'An internal Nen error occurred.',
    hint: 'Unclassified failure wrapped by NenError.from(). See detail for the original error.',
  },
} satisfies Record<string, NenErrorSpec>;

export type NenErrorName = keyof typeof NEN_ERRORS;

/** Reverse lookup: given a code from a log/support ticket, find its spec. */
export function describeNenCode(code: string): NenErrorSpec | undefined {
  return Object.values(NEN_ERRORS).find((s) => s.code === code);
}

/** A coded, self-describing Nen failure thrown by the client SDK. */
export class NenError extends Error {
  readonly code: string;
  readonly status: number;
  readonly hint: string;
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

  static from(err: unknown): NenError {
    if (err instanceof NenError) return err;
    const msg = err instanceof Error ? err.message : String(err);
    return new NenError('INTERNAL', msg);
  }

  toBody(): { error: { code: string; message: string } } {
    return { error: { code: this.code, message: this.message } };
  }

  /** Structured single-line diagnostic log. */
  log(logger: Pick<Console, 'error'> = console): void {
    const base = `[Nen] ${this.code} (${this.status}): ${this.hint}`;
    logger.error(this.detail ? `${base} | detail=${this.detail}` : base);
  }
}
