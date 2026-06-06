/**
 * Isogeny Error Codes (client mirror).
 *
 * Same diagnostic vocabulary as the server. When a request fails inside the
 * Isogeny layer, the client throws an `IsogenyError` carrying a stable `ISO-xxxx`
 * code and logs a structured diagnosis. The developer's UI code only ever needs
 * the `code` — it never has to interpret the cryptography.
 *
 * This file is a mirror of the canonical catalog in ../../ERROR_CODES.md.
 * Keep the codes identical to the server's `errors.ts`.
 */
interface IsogenyErrorSpec {
    code: string;
    status: number;
    message: string;
    hint: string;
}
declare const ISOGENY_ERRORS: {
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
    CRYPTO_DECRYPT_FAILED: {
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
type IsogenyErrorName = keyof typeof ISOGENY_ERRORS;
/** Reverse lookup: given a code from a log/support ticket, find its spec. */
declare function describeIsogenyCode(code: string): IsogenyErrorSpec | undefined;
/** A coded, self-describing Isogeny failure thrown by the client SDK. */
declare class IsogenyError extends Error {
    readonly code: string;
    readonly status: number;
    readonly hint: string;
    readonly detail?: string;
    constructor(name: IsogenyErrorName, detail?: string);
    static from(err: unknown): IsogenyError;
    toBody(): {
        error: {
            code: string;
            message: string;
        };
    };
    /** Structured single-line diagnostic log. */
    log(logger?: Pick<Console, 'error'>): void;
}

interface IsogenyClientOptions {
    identityMode?: 'none' | 'pqc';
}
declare class IsogenyClient {
    private sharedSecret;
    private hmacKey;
    sessionId: string | null;
    private serverUrl;
    private options;
    private _rotationInProgress;
    private signingKeypair;
    constructor(serverUrl: string, options?: IsogenyClientOptions);
    /**
     * Performs the ML-KEM handshake with the server.
     */
    handshake(): Promise<void>;
    /**
     * Post-Quantum Encrypted Fetch.
     * Encrypts the request body and decrypts the response.
     */
    pqcfetch(endpoint: string, options?: RequestInit): Promise<any>;
    /**
     * Post-Quantum Encrypted Stream.
     * Encrypts the request body and returns an AsyncGenerator that yields decrypted chunks.
     */
    pqcstream(endpoint: string, options?: RequestInit): AsyncGenerator<string>;
    /**
     * Explicitly destroy the session on the server and clear local state.
     */
    terminate(): Promise<void>;
    /**
     * Check if the current session is still valid on the server.
     */
    status(): Promise<boolean>;
    /**
     * Force a key rotation by negotiating a new handshake.
     */
    rotate(): Promise<void>;
}
/**
 * Factory: Creates a pre-configured pqcfetch function bound to a server URL.
 * Usage:
 *   const pqcfetch = createPqcFetch('http://localhost:3000');
 *   await pqcfetch('/api/secure-data', { method: 'POST', body: JSON.stringify({...}) });
 */
declare function createPqcFetch(serverUrl: string): (endpoint: string, options?: RequestInit) => Promise<any>;
/**
 * Factory: Creates a pre-configured pqcstream function bound to a server URL.
 */
declare function createPqcStream(serverUrl: string): (endpoint: string, options?: RequestInit) => AsyncGenerator<string>;

export { ISOGENY_ERRORS, IsogenyClient, type IsogenyClientOptions, IsogenyError, type IsogenyErrorName, type IsogenyErrorSpec, createPqcFetch, createPqcStream, describeIsogenyCode };
