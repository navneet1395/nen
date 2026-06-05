declare class IsogenyClient {
    private sharedSecret;
    private sessionId;
    private serverUrl;
    constructor(serverUrl: string);
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

export { IsogenyClient };
