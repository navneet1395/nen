// src/index.ts
import * as isogenyCrypto from "core-crypto";

// src/errors.ts
var ISOGENY_ERRORS = {
  // 1xxx — Handshake / key exchange
  HANDSHAKE_FAILED: {
    code: "ISO-1002",
    status: 500,
    message: "Secure handshake could not be completed.",
    hint: "ML-KEM key exchange failed locally. Wasm load failure or a malformed server ciphertext."
  },
  HANDSHAKE_NETWORK: {
    code: "ISO-1003",
    status: 503,
    message: "Could not reach the secure handshake endpoint.",
    hint: "fetch() to /api/isogeny/handshake failed at the network layer. Wrong serverUrl, server down, or CORS."
  },
  HANDSHAKE_BAD_RESPONSE: {
    code: "ISO-1004",
    status: 502,
    message: "Secure handshake returned an unexpected response.",
    hint: "Handshake responded non-2xx or with a body missing `sid`/`ct`. The server route is likely not wired to handleHandshake()."
  },
  // 2xxx — Session lifecycle
  SESSION_NOT_INITIALIZED: {
    code: "ISO-2001",
    status: 409,
    message: "Secure session is not established yet.",
    hint: "pqcfetch/pqcstream was called before a successful handshake() (missing sharedSecret/sessionId/hmacKey)."
  },
  // 4xxx — Cryptography
  CRYPTO_DECRYPT_FAILED: {
    code: "ISO-4001",
    status: 400,
    message: "Server payload could not be decrypted.",
    hint: "ChaCha20-Poly1305 AEAD tag verification failed on the response. Tampered/truncated ciphertext or a desynced shared secret (try rotate())."
  },
  // 7xxx — Streaming
  STREAM_MISSING_NONCE_HEADER: {
    code: "ISO-7001",
    status: 502,
    message: "Encrypted stream is missing its nonce header.",
    hint: "Stream response had no X-Isogeny-Stream-Nonce. The server route did not use withIsogenyStream(), or a proxy stripped the header."
  },
  STREAM_REQUEST_FAILED: {
    code: "ISO-7002",
    status: 502,
    message: "Encrypted stream request failed.",
    hint: "Stream response was non-ok or had no body. The upstream handler errored before streaming began."
  },
  // 9xxx — Internal
  INTERNAL: {
    code: "ISO-9000",
    status: 500,
    message: "An internal Isogeny error occurred.",
    hint: "Unclassified failure wrapped by IsogenyError.from(). See detail for the original error."
  }
};
function describeIsogenyCode(code) {
  return Object.values(ISOGENY_ERRORS).find((s) => s.code === code);
}
var IsogenyError = class _IsogenyError extends Error {
  code;
  status;
  hint;
  detail;
  constructor(name, detail) {
    const spec = ISOGENY_ERRORS[name];
    super(spec.message);
    this.name = "IsogenyError";
    this.code = spec.code;
    this.status = spec.status;
    this.hint = spec.hint;
    this.detail = detail;
  }
  static from(err) {
    if (err instanceof _IsogenyError) return err;
    const msg = err instanceof Error ? err.message : String(err);
    return new _IsogenyError("INTERNAL", msg);
  }
  toBody() {
    return { error: { code: this.code, message: this.message } };
  }
  /** Structured single-line diagnostic log. */
  log(logger = console) {
    const base = `[Isogeny] ${this.code} (${this.status}): ${this.hint}`;
    logger.error(this.detail ? `${base} | detail=${this.detail}` : base);
  }
};

// src/index.ts
function fail(name, detail) {
  const err = new IsogenyError(name, detail);
  err.log();
  throw err;
}
var IsogenyClient = class {
  sharedSecret = null;
  hmacKey = null;
  sessionId = null;
  serverUrl;
  options;
  _rotationInProgress = false;
  signingKeypair = null;
  // Holds the ML-DSA keypair if identityMode is 'pqc'
  constructor(serverUrl, options = {}) {
    this.serverUrl = serverUrl;
    this.options = { identityMode: "none", ...options };
  }
  /**
   * Performs the ML-KEM handshake with the server.
   */
  async handshake() {
    const keypair = isogenyCrypto.isogeny_generate_keypair();
    const publicKey = keypair.public_key;
    const secretKey = keypair.secret_key;
    const payload = {
      pk: isogenyCrypto.isogeny_to_base64(publicKey)
    };
    if (this.options.identityMode === "pqc") {
      if (!this.signingKeypair) {
        this.signingKeypair = isogenyCrypto.isogeny_generate_signing_keypair();
      }
      const sigPk = this.signingKeypair.public_key;
      const sigOfPk = isogenyCrypto.isogeny_sign(this.signingKeypair.secret_key, publicKey);
      payload.sigPk = isogenyCrypto.isogeny_to_base64(sigPk);
      payload.sigOfPk = isogenyCrypto.isogeny_to_base64(sigOfPk);
    }
    let response;
    try {
      response = await fetch(`${this.serverUrl}/api/isogeny/handshake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      fail("HANDSHAKE_NETWORK", e instanceof Error ? e.message : String(e));
    }
    if (!response.ok) {
      fail("HANDSHAKE_BAD_RESPONSE", `status=${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    this.sessionId = data.sid;
    if (data.hmac) {
      this.hmacKey = isogenyCrypto.isogeny_from_base64(data.hmac);
    }
    const ciphertext = isogenyCrypto.isogeny_from_base64(data.ct);
    this.sharedSecret = isogenyCrypto.isogeny_decapsulate(ciphertext, secretKey);
    secretKey.fill(0);
  }
  /**
   * Post-Quantum Encrypted Fetch.
   * Encrypts the request body and decrypts the response.
   */
  async pqcfetch(endpoint, options = {}) {
    if (!this.sharedSecret || !this.sessionId || !this.hmacKey) {
      fail("SESSION_NOT_INITIALIZED");
    }
    let requestBody = void 0;
    let nonceBase64 = "";
    if (options.body) {
      const plaintext = new TextEncoder().encode(options.body);
      const nonce = isogenyCrypto.isogeny_generate_nonce();
      const ciphertext = isogenyCrypto.isogeny_encrypt(this.sharedSecret, nonce, plaintext);
      nonceBase64 = isogenyCrypto.isogeny_to_base64(nonce);
      requestBody = JSON.stringify({
        sessionId: this.sessionId,
        ct: isogenyCrypto.isogeny_to_base64(ciphertext),
        n: nonceBase64
      });
    }
    const method = options.method || "GET";
    const timestamp = Date.now().toString();
    const canonical = `${method}
${endpoint}
${timestamp}
${nonceBase64}`;
    const canonicalBytes = new TextEncoder().encode(canonical);
    const signatureBytes = isogenyCrypto.isogeny_hmac_sign(this.hmacKey, canonicalBytes);
    const signatureBase64 = isogenyCrypto.isogeny_to_base64(signatureBytes);
    const fetchOptions = {
      ...options,
      headers: {
        ...options.headers,
        "Content-Type": "application/json",
        "X-Isogeny-Session": this.sessionId,
        "X-Isogeny-Timestamp": timestamp,
        "X-Isogeny-Signature": signatureBase64
      },
      body: requestBody
    };
    const response = await fetch(`${this.serverUrl}${endpoint}`, fetchOptions);
    if (response.status === 401 && !this._rotationInProgress) {
      console.warn("[IsogenyClient] Session expired. Automatically rotating key...");
      this._rotationInProgress = true;
      try {
        await this.rotate();
        return this.pqcfetch(endpoint, options);
      } finally {
        this._rotationInProgress = false;
      }
    }
    if (!response.ok) return response;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      if (data.ct && data.n) {
        const ct = isogenyCrypto.isogeny_from_base64(data.ct);
        const nonce = isogenyCrypto.isogeny_from_base64(data.n);
        let decrypted;
        try {
          decrypted = isogenyCrypto.isogeny_decrypt(this.sharedSecret, nonce, ct);
        } catch (e) {
          fail("CRYPTO_DECRYPT_FAILED", e instanceof Error ? e.message : String(e));
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
  async *pqcstream(endpoint, options = {}) {
    if (!this.sharedSecret || !this.sessionId || !this.hmacKey) {
      fail("SESSION_NOT_INITIALIZED");
    }
    let requestBody = void 0;
    let nonceBase64 = "";
    if (options.body) {
      const plaintext = new TextEncoder().encode(options.body);
      const nonce = isogenyCrypto.isogeny_generate_nonce();
      const ciphertext = isogenyCrypto.isogeny_encrypt(this.sharedSecret, nonce, plaintext);
      nonceBase64 = isogenyCrypto.isogeny_to_base64(nonce);
      requestBody = JSON.stringify({
        sessionId: this.sessionId,
        ct: isogenyCrypto.isogeny_to_base64(ciphertext),
        n: nonceBase64
      });
    }
    const method = options.method || "GET";
    const timestamp = Date.now().toString();
    const canonical = `${method}
${endpoint}
${timestamp}
${nonceBase64}`;
    const canonicalBytes = new TextEncoder().encode(canonical);
    const signatureBytes = isogenyCrypto.isogeny_hmac_sign(this.hmacKey, canonicalBytes);
    const signatureBase64 = isogenyCrypto.isogeny_to_base64(signatureBytes);
    const fetchOptions = {
      ...options,
      headers: {
        ...options.headers,
        "Content-Type": "application/json",
        "X-Isogeny-Session": this.sessionId,
        "X-Isogeny-Timestamp": timestamp,
        "X-Isogeny-Signature": signatureBase64
      },
      body: requestBody
    };
    const response = await fetch(`${this.serverUrl}${endpoint}`, fetchOptions);
    if (response.status === 401 && !this._rotationInProgress) {
      console.warn("[IsogenyClient] Session expired. Automatically rotating key...");
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
      fail("STREAM_REQUEST_FAILED", `status=${response.status} ${response.statusText}`);
    }
    const baseNonceBase64 = response.headers.get("X-Isogeny-Stream-Nonce");
    if (!baseNonceBase64) {
      fail("STREAM_MISSING_NONCE_HEADER");
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
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const base64Ct = line.substring(6).trim();
            if (!base64Ct) continue;
            const ciphertext = isogenyCrypto.isogeny_from_base64(base64Ct);
            const nonce = xorNonce(baseNonce, chunkIndex);
            const decrypted = isogenyCrypto.isogeny_decrypt(this.sharedSecret, nonce, ciphertext);
            const decryptedStr = new TextDecoder().decode(decrypted);
            if (decryptedStr === "__FIN__") {
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
  async terminate() {
    if (!this.sessionId) return;
    try {
      await fetch(`${this.serverUrl}/api/isogeny/terminate`, {
        method: "POST",
        headers: { "X-Isogeny-Session": this.sessionId }
      });
    } catch (e) {
      console.warn("Failed to cleanly terminate Isogeny session on server");
    }
    this.sessionId = null;
    this.sharedSecret = null;
  }
  /**
   * Check if the current session is still valid on the server.
   */
  async status() {
    if (!this.sessionId) return false;
    try {
      const response = await fetch(`${this.serverUrl}/api/isogeny/status`, {
        method: "GET",
        headers: { "X-Isogeny-Session": this.sessionId }
      });
      return response.status === 200;
    } catch (e) {
      return false;
    }
  }
  /**
   * Force a key rotation by negotiating a new handshake.
   */
  async rotate() {
    await this.handshake();
  }
};
function xorNonce(baseNonce, index) {
  const nonce = new Uint8Array(baseNonce);
  const dataView = new DataView(nonce.buffer);
  const current = dataView.getUint32(8, true);
  dataView.setUint32(8, current ^ index, true);
  return nonce;
}
function createPqcFetch(serverUrl) {
  const client = new IsogenyClient(serverUrl);
  let handshakePromise = null;
  return async (endpoint, options = {}) => {
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
function createPqcStream(serverUrl) {
  const client = new IsogenyClient(serverUrl);
  let handshakePromise = null;
  return async function* (endpoint, options = {}) {
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
export {
  ISOGENY_ERRORS,
  IsogenyClient,
  IsogenyError,
  createPqcFetch,
  createPqcStream,
  describeIsogenyCode
};
