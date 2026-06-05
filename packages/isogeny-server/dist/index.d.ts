/**
 * Handles incoming POST requests to /_isogeny/handshake.
 * Generates a shared secret, stores it, and returns the ciphertext to the client.
 */
declare function handleHandshake(req: Request): Promise<Response>;
/**
 * Handles explicit session termination (logout)
 */
declare function handleTerminate(req: Request): Promise<Response>;
/**
 * Handles lightweight session status checks
 */
declare function handleStatus(req: Request): Promise<Response>;
/**
 * Helper to decrypt incoming data from an Isogeny client
 */
declare function decryptPayload(sessionId: string, encryptedData: {
    ciphertext: number[];
    nonce: number[];
}): Uint8Array | null;
/**
 * Helper to encrypt outgoing data back to an Isogeny client
 */
declare function encryptPayload(sessionId: string, plaintext: Uint8Array): {
    ciphertext: number[];
    nonce: number[];
};

/**
 * A Next.js App Router Route Handler wrapper.
 * Intercepts POST/PUT requests, decrypts the Isogeny PQC payload,
 * passes the decrypted JSON to the user's handler, and then encrypts
 * the JSON response before sending it back.
 *
 * @param handler The user's route handler function
 */
declare function withIsogeny(handler: (req: Request, body: any) => Promise<any> | any): (req: Request) => Promise<Response>;

declare function storeSession(sessionId: string, sharedSecret: Uint8Array): void;
declare function getSession(sessionId: string): Uint8Array | null;

export { decryptPayload, encryptPayload, getSession, handleHandshake, handleStatus, handleTerminate, storeSession, withIsogeny };
