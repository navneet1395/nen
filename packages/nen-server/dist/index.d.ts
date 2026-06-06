/**
 * Handles incoming POST requests to /api/nen/handshake.
 * Generates a shared secret, stores it, and returns the ciphertext to the client.
 */
declare function handleHandshake(req: Request): Promise<Response>;
/**
 * Handles explicit session termination (logout).
 * Immediately destroys the shared secret from server memory for Perfect Forward Secrecy.
 */
declare function handleTerminate(req: Request): Promise<Response>;
/**
 * Handles lightweight session status checks (heartbeats).
 */
declare function handleStatus(req: Request): Promise<Response>;
/**
 * Handles key rotation by performing a fresh handshake.
 * The old session is destroyed and a new session with a new shared secret is created.
 */
declare function handleRotate(req: Request): Promise<Response>;
/**
 * Helper to decrypt incoming data from an Nen client.
 * Also performs nonce replay detection if the session store supports it.
 */
declare function decryptPayload(sessionId: string, encryptedData: {
    ct?: string;
    n?: string;
}, requestMeta?: {
    method: string;
    url: string;
    timestamp: string;
    signature: string;
}, strict?: boolean): Promise<Uint8Array | null>;
/**
 * Helper to encrypt outgoing data back to an Nen client.
 */
declare function encryptPayload(sessionId: string, plaintext: Uint8Array): Promise<{
    ct: string;
    n: string;
}>;

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
declare function withNen(handler: (req: Request, body: any) => Promise<any> | any, options?: {
    strict?: boolean;
}): (req: Request) => Promise<Response>;

/**
 * A Next.js App Router Route Handler wrapper for streaming responses.
 *
 * Intercepts requests, decrypts the Nen PQC payload,
 * passes the decrypted JSON to the user's handler, and then encrypts
 * the resulting ReadableStream or AsyncIterable chunk by chunk before sending it back.
 *
 * @param handler The user's route handler function that returns a ReadableStream or Response
 */
declare function withNenStream(handler: (req: Request, body: any) => Promise<ReadableStream | Response | AsyncIterable<any>> | ReadableStream | Response | AsyncIterable<any>): (req: Request) => Promise<Response>;

/**
 * Pluggable SessionStore interface.
 * The default implementation uses an in-memory Map with globalThis binding
 * to survive Next.js HMR. Users can implement this interface to plug in
 * Redis, Cloudflare KV, Upstash, or any other backend.
 */
interface SessionStore {
    get(sessionId: string): {
        sharedSecret: Uint8Array;
        hmacKey: Uint8Array;
    } | null | Promise<{
        sharedSecret: Uint8Array;
        hmacKey: Uint8Array;
    } | null>;
    set(sessionId: string, sharedSecret: Uint8Array, hmacKey: Uint8Array, ttlMs?: number): void | Promise<void>;
    delete(sessionId: string): boolean | Promise<boolean>;
    exists(sessionId: string): boolean | Promise<boolean>;
    hasNonce?(sessionId: string, nonce: string): boolean | Promise<boolean>;
    trackNonce?(sessionId: string, nonce: string): void | Promise<void>;
}
declare class InMemorySessionStore implements SessionStore {
    private expiryMs;
    constructor(expiryMs?: number);
    set(sessionId: string, sharedSecret: Uint8Array, hmacKey: Uint8Array): void;
    get(sessionId: string): {
        sharedSecret: Uint8Array;
        hmacKey: Uint8Array;
    } | null;
    delete(sessionId: string): boolean;
    exists(sessionId: string): boolean;
    hasNonce(sessionId: string, nonce: string): boolean;
    trackNonce(sessionId: string, nonce: string): void;
}
/** Replace the default session store with a custom implementation (e.g. Redis). */
declare function setSessionStore(store: SessionStore): void;
/** Get the active session store instance. */
declare function getSessionStore(): SessionStore;
declare function storeSession(sessionId: string, sharedSecret: Uint8Array, hmacKey: Uint8Array): void | Promise<void>;
declare function getSession(sessionId: string): {
    sharedSecret: Uint8Array;
    hmacKey: Uint8Array;
} | Promise<{
    sharedSecret: Uint8Array;
    hmacKey: Uint8Array;
} | null> | null;
declare function deleteSession(sessionId: string): boolean | Promise<boolean>;
declare function sessionExists(sessionId: string): boolean | Promise<boolean>;

/**
 * Interface representing a minimal Redis client (like Upstash Redis)
 */
interface MinimalRedisClient {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, opts?: {
        ex?: number;
    }): Promise<string | null | "OK">;
    del(key: string): Promise<number>;
    exists(key: string): Promise<number>;
    sadd(key: string, ...members: string[]): Promise<number>;
    sismember(key: string, member: string): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;
}
declare class RedisSessionStore implements SessionStore {
    private redis;
    private prefix;
    private expiryMs;
    constructor(redisClient: MinimalRedisClient, prefix?: string, expiryMs?: number);
    set(sessionId: string, sharedSecret: Uint8Array, hmacKey: Uint8Array): Promise<void>;
    get(sessionId: string): Promise<{
        sharedSecret: Uint8Array;
        hmacKey: Uint8Array;
    } | null>;
    delete(sessionId: string): Promise<boolean>;
    exists(sessionId: string): Promise<boolean>;
    hasNonce(sessionId: string, nonce: string): Promise<boolean>;
    trackNonce(sessionId: string, nonce: string): Promise<void>;
}

/**
 * Upstash REST session store.
 *
 * Talks to the Upstash Redis REST API directly over `fetch` — no TCP socket and
 * no `@upstash/redis` dependency — so it runs in any Edge runtime (Cloudflare
 * Workers, Vercel Edge, Deno). Pass the REST URL and token from your Upstash
 * dashboard (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).
 *
 *   import { setSessionStore } from '@withnen/server';
 *   import { UpstashSessionStore } from '@withnen/server';
 *
 *   setSessionStore(new UpstashSessionStore(
 *     process.env.UPSTASH_REDIS_REST_URL!,
 *     process.env.UPSTASH_REDIS_REST_TOKEN!,
 *   ));
 */
declare class UpstashSessionStore implements SessionStore {
    private url;
    private token;
    private prefix;
    private ttlSeconds;
    constructor(restUrl: string, restToken: string, prefix?: string, ttlSeconds?: number);
    /** Send a single Redis command to the Upstash REST endpoint. */
    private cmd;
    set(sessionId: string, sharedSecret: Uint8Array, hmacKey: Uint8Array): Promise<void>;
    get(sessionId: string): Promise<{
        sharedSecret: Uint8Array;
        hmacKey: Uint8Array;
    } | null>;
    delete(sessionId: string): Promise<boolean>;
    exists(sessionId: string): Promise<boolean>;
    hasNonce(sessionId: string, nonce: string): Promise<boolean>;
    trackNonce(sessionId: string, nonce: string): Promise<void>;
}

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
interface NenErrorSpec {
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
declare const NEN_ERRORS: {
    HANDSHAKE_MISSING_PUBLIC_KEY: {
        code: string;
        status: number;
        message: string;
        hint: string;
    };
    HANDSHAKE_FAILED: {
        code: string;
        status: number;
        message: string;
        hint: string;
    };
    HANDSHAKE_NETWORK: {
        code: string;
        status: number;
        message: string;
        hint: string;
    };
    HANDSHAKE_BAD_RESPONSE: {
        code: string;
        status: number;
        message: string;
        hint: string;
    };
    SESSION_NOT_INITIALIZED: {
        code: string;
        status: number;
        message: string;
        hint: string;
    };
    SESSION_INVALID_OR_EXPIRED: {
        code: string;
        status: number;
        message: string;
        hint: string;
    };
    SESSION_HEADER_MISSING: {
        code: string;
        status: number;
        message: string;
        hint: string;
    };
    AUTH_SIGNATURE_MISSING: {
        code: string;
        status: number;
        message: string;
        hint: string;
    };
    AUTH_SIGNATURE_INVALID: {
        code: string;
        status: number;
        message: string;
        hint: string;
    };
    AUTH_TIMESTAMP_OUT_OF_WINDOW: {
        code: string;
        status: number;
        message: string;
        hint: string;
    };
    AUTH_IDENTITY_SIGNATURE_INVALID: {
        code: string;
        status: number;
        message: string;
        hint: string;
    };
    CRYPTO_DECRYPT_FAILED: {
        code: string;
        status: number;
        message: string;
        hint: string;
    };
    CRYPTO_ENCRYPT_FAILED: {
        code: string;
        status: number;
        message: string;
        hint: string;
    };
    CRYPTO_PAYLOAD_NOT_JSON: {
        code: string;
        status: number;
        message: string;
        hint: string;
    };
    REPLAY_NONCE_REUSED: {
        code: string;
        status: number;
        message: string;
        hint: string;
    };
    WIRE_INVALID_PAYLOAD_FORMAT: {
        code: string;
        status: number;
        message: string;
        hint: string;
    };
    WIRE_DECODE_FAILED: {
        code: string;
        status: number;
        message: string;
        hint: string;
    };
    STREAM_MISSING_NONCE_HEADER: {
        code: string;
        status: number;
        message: string;
        hint: string;
    };
    STREAM_REQUEST_FAILED: {
        code: string;
        status: number;
        message: string;
        hint: string;
    };
    INTERNAL: {
        code: string;
        status: number;
        message: string;
        hint: string;
    };
};
type NenErrorName = keyof typeof NEN_ERRORS;
/** Reverse lookup: given a code from a log/support ticket, find its spec. */
declare function describeNenCode(code: string): NenErrorSpec | undefined;
/**
 * A coded, self-describing Nen failure.
 *
 *   throw new NenError('AUTH_SIGNATURE_MISSING');
 *   ...
 *   } catch (e) { return NenError.from(e).toResponse(); }
 */
declare class NenError extends Error {
    /** Stable code, e.g. "ISO-3001". */
    readonly code: string;
    /** Suggested HTTP status. */
    readonly status: number;
    /** Internal diagnosis. Logged, never sent on the wire. */
    readonly hint: string;
    /** Optional runtime detail (e.g. an upstream error message). Logged only. */
    readonly detail?: string;
    constructor(name: NenErrorName, detail?: string);
    /** Wrap any thrown value as a coded error (unknown → ISO-9000). */
    static from(err: unknown): NenError;
    /**
     * The safe wire body — code + public message ONLY. The hint is never included.
     * The caller's frontend/backend can surface `code` for support without ever
     * touching crypto internals.
     */
    toBody(): {
        error: {
            code: string;
            message: string;
        };
    };
    /**
     * Structured single-line diagnostic log. This is the line we read to diagnose:
     *   [Nen] ISO-3001 (401) AUTH_SIGNATURE_MISSING: <hint> | detail=<detail>
     */
    log(logger?: Pick<Console, 'error'>): void;
    /** Build a JSON Response (server). Logs the diagnosis as a side effect. */
    toResponse(): Response;
}

export { InMemorySessionStore, type MinimalRedisClient, NEN_ERRORS, NenError, type NenErrorName, type NenErrorSpec, RedisSessionStore, type SessionStore, UpstashSessionStore, decryptPayload, deleteSession, describeNenCode, encryptPayload, getSession, getSessionStore, handleHandshake, handleRotate, handleStatus, handleTerminate, sessionExists, setSessionStore, storeSession, withNen, withNenStream };
