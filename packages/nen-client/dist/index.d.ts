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
interface NenErrorSpec {
    code: string;
    status: number;
    message: string;
    hint: string;
}
declare const NEN_ERRORS: {
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
type NenErrorName = keyof typeof NEN_ERRORS;
/** Reverse lookup: given a code from a log/support ticket, find its spec. */
declare function describeNenCode(code: string): NenErrorSpec | undefined;
/** A coded, self-describing Nen failure thrown by the client SDK. */
declare class NenError extends Error {
    readonly code: string;
    readonly status: number;
    readonly hint: string;
    readonly detail?: string;
    constructor(name: NenErrorName, detail?: string);
    static from(err: unknown): NenError;
    toBody(): {
        error: {
            code: string;
            message: string;
        };
    };
    /** Structured single-line diagnostic log. */
    log(logger?: Pick<Console, 'error'>): void;
}

interface NenClientOptions {
    identityMode?: 'none' | 'pqc';
}
declare class NenClient {
    private sharedSecret;
    private hmacKey;
    sessionId: string | null;
    private serverUrl;
    private options;
    private _rotationInProgress;
    private signingKeypair;
    constructor(serverUrl: string, options?: NenClientOptions);
    /**
     * Performs the ML-KEM handshake with the server.
     */
    handshake(): Promise<void>;
    /**
     * Post-Quantum Encrypted Fetch.
     * Encrypts the request body and decrypts the response.
     */
    nenFetch(endpoint: string, options?: RequestInit): Promise<any>;
    /**
     * Post-Quantum Encrypted Stream.
     * Encrypts the request body and returns an AsyncGenerator that yields decrypted chunks.
     */
    nenStream(endpoint: string, options?: RequestInit): AsyncGenerator<string>;
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
 * Factory: Creates a pre-configured nenFetch function bound to a server URL.
 * Usage:
 *   const nenFetch = createNenFetch('http://localhost:3000');
 *   await nenFetch('/api/secure-data', { method: 'POST', body: JSON.stringify({...}) });
 */
declare function createNenFetch(serverUrl: string): (endpoint: string, options?: RequestInit) => Promise<any>;
/**
 * Factory: Creates a pre-configured nenStream function bound to a server URL.
 */
declare function createNenStream(serverUrl: string): (endpoint: string, options?: RequestInit) => AsyncGenerator<string>;

export { NEN_ERRORS, NenClient, type NenClientOptions, NenError, type NenErrorName, type NenErrorSpec, createNenFetch, createNenStream, describeNenCode };
