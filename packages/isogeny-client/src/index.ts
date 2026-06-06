import * as isogenyCrypto from 'core-crypto';
import { IsogenyError } from './errors';

export { IsogenyError, ISOGENY_ERRORS, describeIsogenyCode } from './errors';
export type { IsogenyErrorSpec, IsogenyErrorName } from './errors';

export interface IsogenyClientOptions {
  identityMode?: 'none' | 'pqc';
}

/** Throw a coded IsogenyError, logging the diagnosis first. */
function fail(name: import('./errors').IsogenyErrorName, detail?: string): never {
  const err = new IsogenyError(name, detail);
  err.log();
  throw err;
}

export class IsogenyClient {
  private sharedSecret: Uint8Array | null = null;
  private hmacKey: Uint8Array | null = null;
  sessionId: string | null = null;
  private serverUrl: string;
  private options: IsogenyClientOptions;
  private _rotationInProgress = false;
  private signingKeypair: any = null; // Holds the ML-DSA keypair if identityMode is 'pqc'

  constructor(serverUrl: string, options: IsogenyClientOptions = {}) {
    this.serverUrl = serverUrl;
    this.options = { identityMode: 'none', ...options };
  }

  /**
   * Performs the ML-KEM handshake with the server.
   */
  async handshake(): Promise<void> {
    // Generate keypair for ML-KEM
    const keypair = isogenyCrypto.isogeny_generate_keypair();
    const publicKey = keypair.public_key;
    const secretKey = keypair.secret_key;

    const payload: any = {
      pk: isogenyCrypto.isogeny_to_base64(publicKey),
    };

    // If PQC identity mode is enabled, attach signature
    if (this.options.identityMode === 'pqc') {
      if (!this.signingKeypair) {
        this.signingKeypair = isogenyCrypto.isogeny_generate_signing_keypair();
      }
      
      const sigPk = this.signingKeypair.public_key;
      const sigOfPk = isogenyCrypto.isogeny_sign(this.signingKeypair.secret_key, publicKey);
      
      payload.sigPk = isogenyCrypto.isogeny_to_base64(sigPk);
      payload.sigOfPk = isogenyCrypto.isogeny_to_base64(sigOfPk);
    }

    // Send public key (and optional signature) to server
    let response: Response;
    try {
      response = await fetch(`${this.serverUrl}/api/isogeny/handshake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      fail('HANDSHAKE_NETWORK', e instanceof Error ? e.message : String(e));
    }

    if (!response.ok) {
      fail('HANDSHAKE_BAD_RESPONSE', `status=${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    this.sessionId = data.sid;

    if (data.hmac) {
      this.hmacKey = isogenyCrypto.isogeny_from_base64(data.hmac);
    }

    const ciphertext = isogenyCrypto.isogeny_from_base64(data.ct);

    // Decapsulate the shared secret
    this.sharedSecret = isogenyCrypto.isogeny_decapsulate(ciphertext, secretKey);

    // SECURITY: Immediately wipe the secret key from memory
    secretKey.fill(0);
  }

  /**
   * Post-Quantum Encrypted Fetch.
   * Encrypts the request body and decrypts the response.
   */
  async pqcfetch(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.sharedSecret || !this.sessionId || !this.hmacKey) {
      fail('SESSION_NOT_INITIALIZED');
    }

    let requestBody = undefined;
    let nonceBase64 = "";
    
    if (options.body) {
      // Encrypt the body
      const plaintext = new TextEncoder().encode(options.body as string);
      const nonce = isogenyCrypto.isogeny_generate_nonce();
      const ciphertext = isogenyCrypto.isogeny_encrypt(this.sharedSecret, nonce, plaintext);
      
      nonceBase64 = isogenyCrypto.isogeny_to_base64(nonce);
      requestBody = JSON.stringify({
        sessionId: this.sessionId,
        ct: isogenyCrypto.isogeny_to_base64(ciphertext),
        n: nonceBase64
      });
    }

    const method = options.method || 'GET';
    const timestamp = Date.now().toString();
    
    // Construct canonical string and compute HMAC
    const canonical = `${method}\n${endpoint}\n${timestamp}\n${nonceBase64}`;
    const canonicalBytes = new TextEncoder().encode(canonical);
    const signatureBytes = isogenyCrypto.isogeny_hmac_sign(this.hmacKey, canonicalBytes);
    const signatureBase64 = isogenyCrypto.isogeny_to_base64(signatureBytes);

    const fetchOptions: RequestInit = {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
        'X-Isogeny-Session': this.sessionId,
        'X-Isogeny-Timestamp': timestamp,
        'X-Isogeny-Signature': signatureBase64
      },
      body: requestBody
    };

    const response = await fetch(`${this.serverUrl}${endpoint}`, fetchOptions);

    if (response.status === 401 && !this._rotationInProgress) {
      console.warn('[IsogenyClient] Session expired. Automatically rotating key...');
      this._rotationInProgress = true;
      try {
        await this.rotate();
        return this.pqcfetch(endpoint, options);
      } finally {
        this._rotationInProgress = false;
      }
    }

    if (!response.ok) return response;

    // If it's a JSON response, we decrypt the payload
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();

      // Base64-only wire format (ISOGENY-PROTOCOL-V1): { ct, n }.
      if (data.ct && data.n) {
        const ct = isogenyCrypto.isogeny_from_base64(data.ct);
        const nonce = isogenyCrypto.isogeny_from_base64(data.n);

        let decrypted: Uint8Array;
        try {
          decrypted = isogenyCrypto.isogeny_decrypt(this.sharedSecret, nonce, ct);
        } catch (e) {
          fail('CRYPTO_DECRYPT_FAILED', e instanceof Error ? e.message : String(e));
        }
        const decryptedStr = new TextDecoder().decode(decrypted);
        return JSON.parse(decryptedStr);
      }
      return data;
    }

    return response;
  }

  /**
   * Post-Quantum Encrypted Stream.
   * Encrypts the request body and returns an AsyncGenerator that yields decrypted chunks.
   */
  async *pqcstream(endpoint: string, options: RequestInit = {}): AsyncGenerator<string> {
    if (!this.sharedSecret || !this.sessionId || !this.hmacKey) {
      fail('SESSION_NOT_INITIALIZED');
    }

    let requestBody = undefined;
    let nonceBase64 = "";
    
    if (options.body) {
      const plaintext = new TextEncoder().encode(options.body as string);
      const nonce = isogenyCrypto.isogeny_generate_nonce();
      const ciphertext = isogenyCrypto.isogeny_encrypt(this.sharedSecret, nonce, plaintext);
      
      nonceBase64 = isogenyCrypto.isogeny_to_base64(nonce);
      requestBody = JSON.stringify({
        sessionId: this.sessionId,
        ct: isogenyCrypto.isogeny_to_base64(ciphertext),
        n: nonceBase64
      });
    }

    const method = options.method || 'GET';
    const timestamp = Date.now().toString();
    
    const canonical = `${method}\n${endpoint}\n${timestamp}\n${nonceBase64}`;
    const canonicalBytes = new TextEncoder().encode(canonical);
    const signatureBytes = isogenyCrypto.isogeny_hmac_sign(this.hmacKey, canonicalBytes);
    const signatureBase64 = isogenyCrypto.isogeny_to_base64(signatureBytes);

    const fetchOptions: RequestInit = {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
        'X-Isogeny-Session': this.sessionId,
        'X-Isogeny-Timestamp': timestamp,
        'X-Isogeny-Signature': signatureBase64
      },
      body: requestBody
    };

    const response = await fetch(`${this.serverUrl}${endpoint}`, fetchOptions);

    if (response.status === 401 && !this._rotationInProgress) {
      console.warn('[IsogenyClient] Session expired. Automatically rotating key...');
      this._rotationInProgress = true;
      try {
        await this.rotate();
        yield* this.pqcstream(endpoint, options);
        return;
      } finally {
        this._rotationInProgress = false;
      }
    }

    if (!response.ok || !response.body) {
      fail('STREAM_REQUEST_FAILED', `status=${response.status} ${response.statusText}`);
    }

    const baseNonceBase64 = response.headers.get('X-Isogeny-Stream-Nonce');
    if (!baseNonceBase64) {
      fail('STREAM_MISSING_NONCE_HEADER');
    }
    const baseNonce = isogenyCrypto.isogeny_from_base64(baseNonceBase64);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let chunkIndex = 0;
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process SSE lines
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ""; // Keep the last incomplete part in the buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const base64Ct = line.substring(6).trim();
            if (!base64Ct) continue;

            const ciphertext = isogenyCrypto.isogeny_from_base64(base64Ct);
            const nonce = xorNonce(baseNonce, chunkIndex);
            
            const decrypted = isogenyCrypto.isogeny_decrypt(this.sharedSecret, nonce, ciphertext);
            const decryptedStr = new TextDecoder().decode(decrypted);

            if (decryptedStr === '__FIN__') {
              return;
            }

            yield decryptedStr;
            chunkIndex++;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
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

function xorNonce(baseNonce: Uint8Array, index: number): Uint8Array {
  const nonce = new Uint8Array(baseNonce);
  const dataView = new DataView(nonce.buffer);
  const current = dataView.getUint32(8, true);
  dataView.setUint32(8, current ^ index, true);
  return nonce;
}

/**
 * Factory: Creates a pre-configured pqcfetch function bound to a server URL.
 * Usage:
 *   const pqcfetch = createPqcFetch('http://localhost:3000');
 *   await pqcfetch('/api/secure-data', { method: 'POST', body: JSON.stringify({...}) });
 */
export function createPqcFetch(serverUrl: string) {
  const client = new IsogenyClient(serverUrl);
  let handshakePromise: Promise<void> | null = null;

  return async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    if (!client.sessionId) {
      if (!handshakePromise) {
        handshakePromise = client.handshake();
      }
      await handshakePromise;
      handshakePromise = null;
    }
    return client.pqcfetch(endpoint, options);
  };
}

/**
 * Factory: Creates a pre-configured pqcstream function bound to a server URL.
 */
export function createPqcStream(serverUrl: string) {
  const client = new IsogenyClient(serverUrl);
  let handshakePromise: Promise<void> | null = null;

  return async function*(endpoint: string, options: RequestInit = {}): AsyncGenerator<string> {
    if (!client.sessionId) {
      if (!handshakePromise) {
        handshakePromise = client.handshake();
      }
      await handshakePromise;
      handshakePromise = null;
    }
    yield* client.pqcstream(endpoint, options);
  };
}
