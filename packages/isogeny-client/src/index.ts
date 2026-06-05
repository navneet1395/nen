import * as isogenyCrypto from 'core-crypto';

export class IsogenyClient {
  private sharedSecret: Uint8Array | null = null;
  private sessionId: string | null = null;
  private serverUrl: string;

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
  }

  /**
   * Performs the ML-KEM handshake with the server.
   */
  async handshake(): Promise<void> {
    // Generate keypair
    const keypair = isogenyCrypto.isogeny_generate_keypair();
    const publicKey = keypair.public_key;
    const secretKey = keypair.secret_key;

    // Send public key to server
    const response = await fetch(`${this.serverUrl}/api/isogeny/handshake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicKey: Array.from(publicKey), // Send as array of bytes
      }),
    });

    if (!response.ok) {
      throw new Error(`Handshake failed: ${response.statusText}`);
    }

    const data = await response.json();
    this.sessionId = data.sessionId;
    
    const ciphertext = new Uint8Array(data.ciphertext);

    // Decapsulate the shared secret
    this.sharedSecret = isogenyCrypto.isogeny_decapsulate(ciphertext, secretKey);
  }

  /**
   * Post-Quantum Encrypted Fetch.
   * Encrypts the request body and decrypts the response.
   */
  async pqcfetch(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.sharedSecret || !this.sessionId) {
      throw new Error("IsogenyClient is not connected. Call handshake() first.");
    }

    let requestBody = undefined;
    if (options.body) {
      // Encrypt the body
      const plaintext = new TextEncoder().encode(options.body as string);
      const nonce = isogenyCrypto.isogeny_generate_nonce();
      const ciphertext = isogenyCrypto.isogeny_encrypt(this.sharedSecret, nonce, plaintext);
      
      requestBody = JSON.stringify({
        sessionId: this.sessionId,
        ciphertext: Array.from(ciphertext),
        nonce: Array.from(nonce)
      });
    }

    const fetchOptions: RequestInit = {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
        'X-Isogeny-Session': this.sessionId
      },
      body: requestBody
    };

    const response = await fetch(`${this.serverUrl}${endpoint}`, fetchOptions);

    if (response.status === 401) {
      console.warn('[IsogenyClient] Session expired. Automatically rotating key...');
      await this.rotate();
      return this.pqcfetch(endpoint, options); // Retry once
    }

    if (!response.ok) return response;

    // If it's a JSON response, we decrypt the payload
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      
      if (data.ciphertext && data.nonce) {
        const ct = new Uint8Array(data.ciphertext);
        const nonce = new Uint8Array(data.nonce);
        
        const decrypted = isogenyCrypto.isogeny_decrypt(this.sharedSecret, nonce, ct);
        const decryptedStr = new TextDecoder().decode(decrypted);
        return JSON.parse(decryptedStr);
      }
      return data;
    }

    return response;
  }

  /**
   * Explicitly destroy the session on the server and clear local state.
   */
  async terminate(): Promise<void> {
    if (!this.sessionId) return;
    try {
      await fetch(`${this.serverUrl}/api/isogeny/terminate`, {
        method: 'POST',
        headers: { 'X-Isogeny-Session': this.sessionId }
      });
    } catch (e) {
      console.warn('Failed to cleanly terminate Isogeny session on server');
    }
    this.sessionId = null;
    this.sharedSecret = null;
  }

  /**
   * Check if the current session is still valid on the server.
   */
  async status(): Promise<boolean> {
    if (!this.sessionId) return false;
    try {
      const response = await fetch(`${this.serverUrl}/api/isogeny/status`, {
        method: 'GET',
        headers: { 'X-Isogeny-Session': this.sessionId }
      });
      return response.status === 200;
    } catch (e) {
      return false;
    }
  }

  /**
   * Force a key rotation by negotiating a new handshake.
   */
  async rotate(): Promise<void> {
    await this.handshake();
  }
}
