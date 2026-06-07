import * as nenCrypto from 'core-crypto';
import { NenError } from './errors';

export { NenError, NEN_ERRORS, describeNenCode } from './errors';
export type { NenErrorSpec, NenErrorName } from './errors';

export interface NenClientOptions {
  identityMode?: 'none' | 'pqc';
}

/** Throw a coded NenError, logging the diagnosis first. */
function fail(name: import('./errors').NenErrorName, detail?: string): never {
  const err = new NenError(name, detail);
  err.log();
  throw err;
}

export class NenClient {
  private sharedSecret: Uint8Array | null = null;
  private hmacKey: Uint8Array | null = null;
  sessionId: string | null = null;
  private serverUrl: string;
  private options: NenClientOptions;
  private _rotationInProgress = false;
  private signingKeypair: any = null; // Holds the ML-DSA keypair if identityMode is 'pqc'

  constructor(serverUrl: string, options: NenClientOptions = {}) {
    this.serverUrl = serverUrl;
    this.options = { identityMode: 'none', ...options };
  }

  /**
   * Performs the ML-KEM handshake with the server.
   */
  async handshake(): Promise<void> {
    // Generate keypair for ML-KEM
    const keypair = nenCrypto.nen_generate_keypair();
    const publicKey = keypair.public_key;
    const secretKey = keypair.secret_key;

    const payload: any = {
      pk: nenCrypto.nen_to_base64(publicKey),
    };

    // If PQC identity mode is enabled, attach signature
    if (this.options.identityMode === 'pqc') {
      if (!this.signingKeypair) {
        this.signingKeypair = nenCrypto.nen_generate_signing_keypair();
      }
      
      const sigPk = this.signingKeypair.public_key;
      const sigOfPk = nenCrypto.nen_sign(this.signingKeypair.secret_key, publicKey);
      
      payload.sigPk = nenCrypto.nen_to_base64(sigPk);
      payload.sigOfPk = nenCrypto.nen_to_base64(sigOfPk);
    }

    // Send public key (and optional signature) to server
    let response: Response;
    try {
      response = await fetch(`${this.serverUrl}/api/nen/handshake`, {
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
      this.hmacKey = nenCrypto.nen_from_base64(data.hmac);
    }

    const ciphertext = nenCrypto.nen_from_base64(data.ct);

    // Decapsulate the shared secret
    this.sharedSecret = nenCrypto.nen_decapsulate(ciphertext, secretKey);

    // SECURITY: Immediately wipe the secret key from memory
    secretKey.fill(0);
  }

  /**
   * Post-Quantum Encrypted Fetch.
   * Encrypts the request body and decrypts the response.
   */
  async nenFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.sharedSecret || !this.sessionId || !this.hmacKey) {
      fail('SESSION_NOT_INITIALIZED');
    }

    const method = (options.method || 'GET').toUpperCase();
    const timestamp = Date.now().toString();

    // Always generate a per-request nonce. It travels in the X-Nen-Nonce header
    // — so bodyless GET/HEAD/DELETE are authenticated too — and, when there is a
    // body, doubles as that body's AEAD nonce (NEN-PROTOCOL-V2).
    const nonce = nenCrypto.nen_generate_nonce();
    const nonceBase64 = nenCrypto.nen_to_base64(nonce);

    let requestBody: string | undefined = undefined;
    if (options.body) {
      const plaintext = new TextEncoder().encode(options.body as string);
      const ciphertext = nenCrypto.nen_encrypt(this.sharedSecret, nonce, plaintext);
      requestBody = JSON.stringify({ ct: nenCrypto.nen_to_base64(ciphertext) });
    }

    // Canonical string: METHOD\nPATH\nTIMESTAMP\nNONCE. PATH is the pathname only
    // (no query) — it must match the server's `new URL(req.url).pathname` exactly.
    const path = canonicalPath(endpoint);
    const canonical = `${method}\n${path}\n${timestamp}\n${nonceBase64}`;
    const canonicalBytes = new TextEncoder().encode(canonical);
    const signatureBytes = nenCrypto.nen_hmac_sign(this.hmacKey, canonicalBytes);
    const signatureBase64 = nenCrypto.nen_to_base64(signatureBytes);

    const fetchOptions: RequestInit = {
      ...options,
      method,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
        'X-Nen-Session': this.sessionId,
        'X-Nen-Timestamp': timestamp,
        'X-Nen-Nonce': nonceBase64,
        'X-Nen-Signature': signatureBase64
      },
      body: requestBody
    };

    const response = await fetch(`${this.serverUrl}${endpoint}`, fetchOptions);

    if (response.status === 401 && !this._rotationInProgress) {
      console.warn('[NenClient] Session expired. Automatically rotating key...');
      this._rotationInProgress = true;
      try {
        await this.rotate();
        return this.nenFetch(endpoint, options);
      } finally {
        this._rotationInProgress = false;
      }
    }

    if (!response.ok) return response;

    // If it's a JSON response, we decrypt the payload
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();

      // Base64-only wire format (NEN-PROTOCOL-V1): { ct, n }.
      if (data.ct && data.n) {
        const ct = nenCrypto.nen_from_base64(data.ct);
        const nonce = nenCrypto.nen_from_base64(data.n);

        let decrypted: Uint8Array;
        try {
          decrypted = nenCrypto.nen_decrypt(this.sharedSecret, nonce, ct);
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
  async *nenStream(endpoint: string, options: RequestInit = {}): AsyncGenerator<string> {
    if (!this.sharedSecret || !this.sessionId || !this.hmacKey) {
      fail('SESSION_NOT_INITIALIZED');
    }

    const method = (options.method || 'GET').toUpperCase();
    const timestamp = Date.now().toString();

    // Always generate a per-request nonce in the X-Nen-Nonce header (so a
    // subscribe-style streaming GET is authenticated with no request body).
    const nonce = nenCrypto.nen_generate_nonce();
    const nonceBase64 = nenCrypto.nen_to_base64(nonce);

    let requestBody: string | undefined = undefined;
    if (options.body) {
      const plaintext = new TextEncoder().encode(options.body as string);
      const ciphertext = nenCrypto.nen_encrypt(this.sharedSecret, nonce, plaintext);
      requestBody = JSON.stringify({ ct: nenCrypto.nen_to_base64(ciphertext) });
    }

    const path = canonicalPath(endpoint);
    const canonical = `${method}\n${path}\n${timestamp}\n${nonceBase64}`;
    const canonicalBytes = new TextEncoder().encode(canonical);
    const signatureBytes = nenCrypto.nen_hmac_sign(this.hmacKey, canonicalBytes);
    const signatureBase64 = nenCrypto.nen_to_base64(signatureBytes);

    const fetchOptions: RequestInit = {
      ...options,
      method,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
        'X-Nen-Session': this.sessionId,
        'X-Nen-Timestamp': timestamp,
        'X-Nen-Nonce': nonceBase64,
        'X-Nen-Signature': signatureBase64
      },
      body: requestBody
    };

    const response = await fetch(`${this.serverUrl}${endpoint}`, fetchOptions);

    if (response.status === 401 && !this._rotationInProgress) {
      console.warn('[NenClient] Session expired. Automatically rotating key...');
      this._rotationInProgress = true;
      try {
        await this.rotate();
        yield* this.nenStream(endpoint, options);
        return;
      } finally {
        this._rotationInProgress = false;
      }
    }

    if (!response.ok || !response.body) {
      fail('STREAM_REQUEST_FAILED', `status=${response.status} ${response.statusText}`);
    }

    const baseNonceBase64 = response.headers.get('X-Nen-Stream-Nonce');
    if (!baseNonceBase64) {
      fail('STREAM_MISSING_NONCE_HEADER');
    }
    const baseNonce = nenCrypto.nen_from_base64(baseNonceBase64);

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

            const ciphertext = nenCrypto.nen_from_base64(base64Ct);
            const nonce = xorNonce(baseNonce, chunkIndex);
            
            const decrypted = nenCrypto.nen_decrypt(this.sharedSecret, nonce, ciphertext);
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
      await fetch(`${this.serverUrl}/api/nen/terminate`, {
        method: 'POST',
        headers: { 'X-Nen-Session': this.sessionId }
      });
    } catch (e) {
      console.warn('Failed to cleanly terminate Nen session on server');
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
      const response = await fetch(`${this.serverUrl}/api/nen/status`, {
        method: 'GET',
        headers: { 'X-Nen-Session': this.sessionId }
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
 * Derive the canonical PATH for the HMAC string: pathname only, no query/hash.
 * Must match the server's `new URL(req.url).pathname` exactly. `endpoint` may be
 * relative (e.g. "/api/notes?id=5"); resolve it against a throwaway origin to
 * extract the pathname.
 */
function canonicalPath(endpoint: string): string {
  try {
    return new URL(endpoint, 'http://nen.local').pathname;
  } catch {
    return endpoint.split('?')[0].split('#')[0];
  }
}

/**
 * Factory: Creates a pre-configured nenFetch function bound to a server URL.
 * Usage:
 *   const nenFetch = createNenFetch('http://localhost:3000');
 *   await nenFetch('/api/secure-data', { method: 'POST', body: JSON.stringify({...}) });
 */
export function createNenFetch(serverUrl: string) {
  const client = new NenClient(serverUrl);
  let handshakePromise: Promise<void> | null = null;

  return async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    if (!client.sessionId) {
      if (!handshakePromise) {
        handshakePromise = client.handshake();
      }
      await handshakePromise;
      handshakePromise = null;
    }
    return client.nenFetch(endpoint, options);
  };
}

/**
 * Factory: Creates a pre-configured nenStream function bound to a server URL.
 */
export function createNenStream(serverUrl: string) {
  const client = new NenClient(serverUrl);
  let handshakePromise: Promise<void> | null = null;

  return async function*(endpoint: string, options: RequestInit = {}): AsyncGenerator<string> {
    if (!client.sessionId) {
      if (!handshakePromise) {
        handshakePromise = client.handshake();
      }
      await handshakePromise;
      handshakePromise = null;
    }
    yield* client.nenStream(endpoint, options);
  };
}
