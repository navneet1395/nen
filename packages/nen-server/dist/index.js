"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  InMemorySessionStore: () => InMemorySessionStore,
  NEN_ERRORS: () => NEN_ERRORS,
  NenError: () => NenError,
  RedisSessionStore: () => RedisSessionStore,
  UpstashSessionStore: () => UpstashSessionStore,
  decryptPayload: () => decryptPayload,
  deleteSession: () => deleteSession,
  describeNenCode: () => describeNenCode,
  encryptPayload: () => encryptPayload,
  getSession: () => getSession,
  getSessionStore: () => getSessionStore,
  handleHandshake: () => handleHandshake,
  handleRotate: () => handleRotate,
  handleStatus: () => handleStatus,
  handleTerminate: () => handleTerminate,
  sessionExists: () => sessionExists,
  setSessionStore: () => setSessionStore,
  storeSession: () => storeSession,
  withNen: () => withNen,
  withNenStream: () => withNenStream
});
module.exports = __toCommonJS(index_exports);

// src/middleware.ts
var nenCrypto = __toESM(require("core-crypto"));

// src/store.ts
var globalStore = globalThis;
if (!globalStore.__ISOGENY_SESSIONS) {
  globalStore.__ISOGENY_SESSIONS = /* @__PURE__ */ new Map();
}
var sessionStore = globalStore.__ISOGENY_SESSIONS;
var DEFAULT_EXPIRY_MS = 1e3 * 60 * 60;
var InMemorySessionStore = class {
  expiryMs;
  constructor(expiryMs = DEFAULT_EXPIRY_MS) {
    this.expiryMs = expiryMs;
  }
  set(sessionId, sharedSecret, hmacKey) {
    sessionStore.set(sessionId, {
      sharedSecret,
      hmacKey,
      createdAt: Date.now(),
      usedNonces: /* @__PURE__ */ new Set()
    });
  }
  get(sessionId) {
    const session = sessionStore.get(sessionId);
    if (!session) return null;
    if (Date.now() - session.createdAt > this.expiryMs) {
      sessionStore.delete(sessionId);
      return null;
    }
    return { sharedSecret: session.sharedSecret, hmacKey: session.hmacKey };
  }
  delete(sessionId) {
    return sessionStore.delete(sessionId);
  }
  exists(sessionId) {
    const session = sessionStore.get(sessionId);
    if (!session) return false;
    if (Date.now() - session.createdAt > this.expiryMs) {
      sessionStore.delete(sessionId);
      return false;
    }
    return true;
  }
  hasNonce(sessionId, nonce) {
    const session = sessionStore.get(sessionId);
    if (!session) return false;
    return session.usedNonces.has(nonce);
  }
  trackNonce(sessionId, nonce) {
    const session = sessionStore.get(sessionId);
    if (session) {
      session.usedNonces.add(nonce);
    }
  }
};
var _activeStore = new InMemorySessionStore();
function setSessionStore(store) {
  _activeStore = store;
}
function getSessionStore() {
  return _activeStore;
}
function storeSession(sessionId, sharedSecret, hmacKey) {
  return _activeStore.set(sessionId, sharedSecret, hmacKey);
}
function getSession(sessionId) {
  return _activeStore.get(sessionId);
}
function deleteSession(sessionId) {
  return _activeStore.delete(sessionId);
}
function sessionExists(sessionId) {
  return _activeStore.exists(sessionId);
}
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessionStore.entries()) {
    if (now - session.createdAt > DEFAULT_EXPIRY_MS) {
      sessionStore.delete(id);
    }
  }
}, 1e3 * 60 * 5).unref?.();

// src/errors.ts
var NEN_ERRORS = {
  // 1xxx — Handshake / key exchange
  HANDSHAKE_MISSING_PUBLIC_KEY: {
    code: "ISO-1001",
    status: 400,
    message: "Handshake request was malformed.",
    hint: "Handshake body contained neither `pk` (base64) nor `publicKey` (array). Client SDK out of date or request was not produced by an Nen client."
  },
  HANDSHAKE_FAILED: {
    code: "ISO-1002",
    status: 500,
    message: "Secure handshake could not be completed.",
    hint: "ML-KEM encapsulation/decapsulation threw. Usually a malformed or wrong-length public key, or a Wasm load failure."
  },
  HANDSHAKE_NETWORK: {
    code: "ISO-1003",
    status: 503,
    message: "Could not reach the secure handshake endpoint.",
    hint: "fetch() to /api/nen/handshake failed at the network layer. Wrong serverUrl, server down, or CORS."
  },
  HANDSHAKE_BAD_RESPONSE: {
    code: "ISO-1004",
    status: 502,
    message: "Secure handshake returned an unexpected response.",
    hint: "Handshake responded non-2xx or with a body missing `sid`/`ct`. The route is likely not wired to handleHandshake()."
  },
  // 2xxx — Session lifecycle
  SESSION_NOT_INITIALIZED: {
    code: "ISO-2001",
    status: 409,
    message: "Secure session is not established yet.",
    hint: "nenFetch/nenStream was called before a successful handshake() (missing sharedSecret/sessionId/hmacKey on the client)."
  },
  SESSION_INVALID_OR_EXPIRED: {
    code: "ISO-2002",
    status: 401,
    message: "Secure session is invalid or has expired.",
    hint: "Server session store had no entry for the supplied X-Nen-Session. Expired by TTL, evicted, or this node never saw the handshake (stateless store needed)."
  },
  SESSION_HEADER_MISSING: {
    code: "ISO-2003",
    status: 401,
    message: "Secure session header is missing.",
    hint: "Request arrived without an X-Nen-Session header. Not produced by an Nen client, or a proxy stripped the header."
  },
  // 3xxx — Authentication
  AUTH_SIGNATURE_MISSING: {
    code: "ISO-3001",
    status: 401,
    message: "Request authentication is missing.",
    hint: "No X-Nen-Signature on a session that requires HMAC. HMAC is MANDATORY \u2014 a request without a signature must be rejected (this is the auth-downgrade guard)."
  },
  AUTH_SIGNATURE_INVALID: {
    code: "ISO-3002",
    status: 401,
    message: "Request authentication failed.",
    hint: "HMAC-SHA256 over METHOD\\nPATH\\nTIMESTAMP\\nNONCE did not match. Tampered request, wrong hmacKey, or canonical-string mismatch between client and server (often a path vs. full-URL difference)."
  },
  AUTH_TIMESTAMP_OUT_OF_WINDOW: {
    code: "ISO-3003",
    status: 401,
    message: "Request timestamp is outside the allowed window.",
    hint: "X-Nen-Timestamp is >30s from server time. Clock skew between client and server, or a replayed/delayed request."
  },
  AUTH_IDENTITY_SIGNATURE_INVALID: {
    code: "ISO-3004",
    status: 401,
    message: "Identity verification failed.",
    hint: "Optional ML-DSA identity signature over the ephemeral public key did not verify. Wrong identity key, or a MITM at handshake."
  },
  // 4xxx — Cryptography
  CRYPTO_DECRYPT_FAILED: {
    code: "ISO-4001",
    status: 400,
    message: "Payload could not be decrypted.",
    hint: "ChaCha20-Poly1305 AEAD tag verification failed. Ciphertext/nonce tampered, truncated, or encrypted under a different shared secret."
  },
  CRYPTO_ENCRYPT_FAILED: {
    code: "ISO-4002",
    status: 500,
    message: "Response could not be encrypted.",
    hint: "AEAD encryption threw while sealing the response. Usually a corrupt/missing shared secret on the session."
  },
  CRYPTO_PAYLOAD_NOT_JSON: {
    code: "ISO-4003",
    status: 400,
    message: "Decrypted payload was not valid JSON.",
    hint: "Decryption succeeded but the plaintext did not JSON.parse. The client encrypted a non-JSON body, or content-type mismatch."
  },
  // 5xxx — Replay / nonce
  REPLAY_NONCE_REUSED: {
    code: "ISO-5001",
    status: 409,
    message: "Request was rejected as a replay.",
    hint: "This nonce was already seen for this session. Legitimate retry of an identical signed request, or an actual replay attack."
  },
  // 6xxx — Wire format / encoding
  WIRE_INVALID_PAYLOAD_FORMAT: {
    code: "ISO-6001",
    status: 400,
    message: "Encrypted payload format is invalid.",
    hint: "Body was missing the (ct, n) base64 pair. Not an Nen payload, or a corrupted/truncated body."
  },
  WIRE_DECODE_FAILED: {
    code: "ISO-6002",
    status: 400,
    message: "Encrypted payload could not be decoded.",
    hint: "base64 decode of ct/n/pk failed. Truncated by a proxy, or non-base64 data in a base64 field."
  },
  // 7xxx — Streaming
  STREAM_MISSING_NONCE_HEADER: {
    code: "ISO-7001",
    status: 502,
    message: "Encrypted stream is missing its nonce header.",
    hint: "Stream response had no X-Nen-Stream-Nonce. The server route did not use withNenStream(), or a proxy stripped the header."
  },
  STREAM_REQUEST_FAILED: {
    code: "ISO-7002",
    status: 502,
    message: "Encrypted stream request failed.",
    hint: "Stream response was non-ok or had no body. Upstream handler errored before streaming began."
  },
  // 9xxx — Internal
  INTERNAL: {
    code: "ISO-9000",
    status: 500,
    message: "An internal Nen error occurred.",
    hint: "Unclassified failure wrapped by NenError.from(). See the attached detail for the original error."
  }
};
function describeNenCode(code) {
  return Object.values(NEN_ERRORS).find((s) => s.code === code);
}
var NenError = class _NenError extends Error {
  /** Stable code, e.g. "ISO-3001". */
  code;
  /** Suggested HTTP status. */
  status;
  /** Internal diagnosis. Logged, never sent on the wire. */
  hint;
  /** Optional runtime detail (e.g. an upstream error message). Logged only. */
  detail;
  constructor(name, detail) {
    const spec = NEN_ERRORS[name];
    super(spec.message);
    this.name = "NenError";
    this.code = spec.code;
    this.status = spec.status;
    this.hint = spec.hint;
    this.detail = detail;
  }
  /** Wrap any thrown value as a coded error (unknown → ISO-9000). */
  static from(err) {
    if (err instanceof _NenError) return err;
    const msg = err instanceof Error ? err.message : String(err);
    return new _NenError("INTERNAL", msg);
  }
  /**
   * The safe wire body — code + public message ONLY. The hint is never included.
   * The caller's frontend/backend can surface `code` for support without ever
   * touching crypto internals.
   */
  toBody() {
    return { error: { code: this.code, message: this.message } };
  }
  /**
   * Structured single-line diagnostic log. This is the line we read to diagnose:
   *   [Nen] ISO-3001 (401) AUTH_SIGNATURE_MISSING: <hint> | detail=<detail>
   */
  log(logger = console) {
    const base = `[Nen] ${this.code} (${this.status}): ${this.hint}`;
    logger.error(this.detail ? `${base} | detail=${this.detail}` : base);
  }
  /** Build a JSON Response (server). Logs the diagnosis as a side effect. */
  toResponse() {
    this.log();
    return new Response(JSON.stringify(this.toBody()), {
      status: this.status,
      headers: { "Content-Type": "application/json" }
    });
  }
};

// src/middleware.ts
async function handleHandshake(req) {
  try {
    const body = await req.json();
    let pkBytes;
    if (body.pk) {
      pkBytes = nenCrypto.nen_from_base64(body.pk);
    } else {
      return new NenError("HANDSHAKE_MISSING_PUBLIC_KEY").toResponse();
    }
    if (body.sigPk && body.sigOfPk) {
      const sigPk = nenCrypto.nen_from_base64(body.sigPk);
      const sigOfPk = nenCrypto.nen_from_base64(body.sigOfPk);
      const isValid = nenCrypto.nen_verify_signature(sigPk, pkBytes, sigOfPk);
      if (!isValid) {
        return new NenError("AUTH_IDENTITY_SIGNATURE_INVALID").toResponse();
      }
    }
    const encap = nenCrypto.nen_encapsulate(pkBytes);
    const hmacKey = crypto.getRandomValues(new Uint8Array(32));
    const sessionId = crypto.randomUUID();
    storeSession(sessionId, encap.shared_secret, hmacKey);
    return new Response(JSON.stringify({
      sid: sessionId,
      ct: nenCrypto.nen_to_base64(encap.ciphertext),
      hmac: nenCrypto.nen_to_base64(hmacKey)
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return NenError.from(err instanceof NenError ? err : new NenError("HANDSHAKE_FAILED", err?.message)).toResponse();
  }
}
async function handleTerminate(req) {
  const sessionId = req.headers.get("X-Nen-Session");
  if (sessionId) {
    deleteSession(sessionId);
  }
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
async function handleStatus(req) {
  const sessionId = req.headers.get("X-Nen-Session");
  if (!sessionId || !sessionExists(sessionId)) {
    return new Response(JSON.stringify({ valid: false }), { status: 401 });
  }
  return new Response(JSON.stringify({ valid: true }), { status: 200 });
}
async function handleRotate(req) {
  const oldSessionId = req.headers.get("X-Nen-Session");
  if (oldSessionId) {
    deleteSession(oldSessionId);
  }
  return handleHandshake(req);
}
async function decryptPayload(sessionId, encryptedData, requestMeta, strict = true) {
  const session = await getSession(sessionId);
  if (!session) {
    throw new NenError("SESSION_INVALID_OR_EXPIRED");
  }
  if (!encryptedData.ct || !encryptedData.n) {
    throw new NenError("WIRE_INVALID_PAYLOAD_FORMAT");
  }
  const ctBytes = nenCrypto.nen_from_base64(encryptedData.ct);
  const nonceBytes = nenCrypto.nen_from_base64(encryptedData.n);
  const nonceKey = encryptedData.n;
  const signatureRequired = strict && !!session.hmacKey && session.hmacKey.length > 0;
  if (requestMeta && requestMeta.signature) {
    const urlObj = new URL(requestMeta.url);
    const canonical = `${requestMeta.method}
${urlObj.pathname}
${requestMeta.timestamp}
${nonceKey}`;
    const canonicalBytes = new TextEncoder().encode(canonical);
    const signatureBytes = nenCrypto.nen_from_base64(requestMeta.signature);
    if (!nenCrypto.nen_hmac_verify(session.hmacKey, canonicalBytes, signatureBytes)) {
      throw new NenError("AUTH_SIGNATURE_INVALID");
    }
    const timestampMs = parseInt(requestMeta.timestamp, 10);
    if (isNaN(timestampMs) || Math.abs(Date.now() - timestampMs) > 3e4) {
      throw new NenError("AUTH_TIMESTAMP_OUT_OF_WINDOW");
    }
  } else if (signatureRequired) {
    throw new NenError("AUTH_SIGNATURE_MISSING");
  }
  const store = getSessionStore();
  if (store.hasNonce && store.trackNonce) {
    if (await store.hasNonce(sessionId, nonceKey)) {
      throw new NenError("REPLAY_NONCE_REUSED");
    }
    await store.trackNonce(sessionId, nonceKey);
  }
  try {
    return nenCrypto.nen_decrypt(session.sharedSecret, nonceBytes, ctBytes);
  } catch (e) {
    console.error("Decryption failed", e);
    return null;
  }
}
async function encryptPayload(sessionId, plaintext) {
  const session = await getSession(sessionId);
  if (!session) {
    throw new NenError("SESSION_INVALID_OR_EXPIRED");
  }
  const nonce = nenCrypto.nen_generate_nonce();
  const ciphertext = nenCrypto.nen_encrypt(session.sharedSecret, nonce, plaintext);
  return {
    ct: nenCrypto.nen_to_base64(ciphertext),
    n: nenCrypto.nen_to_base64(nonce)
  };
}

// src/wrapper.ts
function withNen(handler, options = {}) {
  const strict = options.strict ?? true;
  return async (req) => {
    try {
      const sessionId = req.headers.get("X-Nen-Session");
      if (!sessionId) {
        return new NenError("SESSION_HEADER_MISSING").toResponse();
      }
      const encryptedData = await req.json();
      if (!encryptedData.ct || !encryptedData.n) {
        return new NenError("WIRE_INVALID_PAYLOAD_FORMAT").toResponse();
      }
      const requestMeta = {
        method: req.method,
        url: req.url,
        timestamp: req.headers.get("X-Nen-Timestamp") || "",
        signature: req.headers.get("X-Nen-Signature") || ""
      };
      const decryptedBytes = await decryptPayload(sessionId, encryptedData, requestMeta, strict);
      if (!decryptedBytes) {
        return new NenError("CRYPTO_DECRYPT_FAILED").toResponse();
      }
      const plaintextString = new TextDecoder().decode(decryptedBytes);
      let decryptedBody;
      try {
        decryptedBody = JSON.parse(plaintextString);
      } catch (e) {
        return new NenError("CRYPTO_PAYLOAD_NOT_JSON").toResponse();
      }
      const result = await handler(req, decryptedBody);
      const responseString = JSON.stringify(result);
      const responseBytes = new TextEncoder().encode(responseString);
      const encryptedResponse = await encryptPayload(sessionId, responseBytes);
      return new Response(JSON.stringify(encryptedResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (err) {
      return NenError.from(err).toResponse();
    }
  };
}

// src/stream-wrapper.ts
var nenCrypto2 = __toESM(require("core-crypto"));
function xorNonce(baseNonce, index) {
  const nonce = new Uint8Array(baseNonce);
  const dataView = new DataView(nonce.buffer);
  const current = dataView.getUint32(8, true);
  dataView.setUint32(8, current ^ index, true);
  return nonce;
}
function withNenStream(handler) {
  return async (req) => {
    try {
      const sessionId = req.headers.get("X-Nen-Session");
      if (!sessionId) {
        return new NenError("SESSION_HEADER_MISSING").toResponse();
      }
      let decryptedBody = null;
      if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
        const encryptedData = await req.json();
        if (!encryptedData.ct || !encryptedData.n) {
          return new NenError("WIRE_INVALID_PAYLOAD_FORMAT").toResponse();
        }
        const requestMeta = {
          method: req.method,
          url: req.url,
          timestamp: req.headers.get("X-Nen-Timestamp") || "",
          signature: req.headers.get("X-Nen-Signature") || ""
        };
        const decryptedBytes = await decryptPayload(sessionId, encryptedData, requestMeta);
        if (!decryptedBytes) {
          return new NenError("CRYPTO_DECRYPT_FAILED").toResponse();
        }
        const plaintextString = new TextDecoder().decode(decryptedBytes);
        try {
          decryptedBody = JSON.parse(plaintextString);
        } catch (e) {
          decryptedBody = plaintextString;
        }
      }
      const result = await handler(req, decryptedBody);
      let stream;
      let headers = new Headers();
      if (result instanceof Response) {
        if (!result.body) {
          return new NenError("INTERNAL", "Stream handler Response had no body").toResponse();
        }
        stream = result.body;
        result.headers.forEach((v, k) => headers.set(k, v));
      } else if (result instanceof ReadableStream) {
        stream = result;
      } else if (Symbol.asyncIterator in result) {
        stream = new ReadableStream({
          async start(controller) {
            for await (const chunk of result) {
              controller.enqueue(chunk);
            }
            controller.close();
          }
        });
      } else {
        return new NenError("INTERNAL", "Stream handler returned a non-streamable value").toResponse();
      }
      const session = await getSession(sessionId);
      if (!session) {
        return new NenError("SESSION_INVALID_OR_EXPIRED").toResponse();
      }
      const baseNonce = nenCrypto2.nen_generate_nonce();
      headers.set("Content-Type", "text/event-stream");
      headers.set("Cache-Control", "no-cache");
      headers.set("Connection", "keep-alive");
      headers.set("X-Nen-Stream-Nonce", nenCrypto2.nen_to_base64(baseNonce));
      let chunkIndex = 0;
      const encryptStream = new TransformStream({
        transform(chunk, controller) {
          try {
            let chunkBytes;
            if (typeof chunk === "string") {
              chunkBytes = new TextEncoder().encode(chunk);
            } else if (chunk instanceof Uint8Array) {
              chunkBytes = chunk;
            } else {
              chunkBytes = new TextEncoder().encode(JSON.stringify(chunk));
            }
            const nonce = xorNonce(baseNonce, chunkIndex);
            const ciphertext = nenCrypto2.nen_encrypt(session.sharedSecret, nonce, chunkBytes);
            const base64Ct = nenCrypto2.nen_to_base64(ciphertext);
            controller.enqueue(new TextEncoder().encode(`data: ${base64Ct}

`));
            chunkIndex++;
          } catch (e) {
            console.error("Encryption error in stream:", e);
            controller.error(e);
          }
        },
        flush(controller) {
          try {
            const nonce = xorNonce(baseNonce, chunkIndex);
            const ciphertext = nenCrypto2.nen_encrypt(session.sharedSecret, nonce, new TextEncoder().encode("__FIN__"));
            const base64Ct = nenCrypto2.nen_to_base64(ciphertext);
            controller.enqueue(new TextEncoder().encode(`data: ${base64Ct}

`));
          } catch (e) {
            console.error("Encryption error in stream flush:", e);
          }
        }
      });
      return new Response(stream.pipeThrough(encryptStream), {
        status: 200,
        headers
      });
    } catch (err) {
      return NenError.from(err).toResponse();
    }
  };
}

// src/store/redis.ts
var nenCrypto3 = __toESM(require("core-crypto"));
var RedisSessionStore = class {
  redis;
  prefix;
  expiryMs;
  constructor(redisClient, prefix = "nen:session:", expiryMs = 36e5) {
    this.redis = redisClient;
    this.prefix = prefix;
    this.expiryMs = expiryMs;
  }
  async set(sessionId, sharedSecret, hmacKey) {
    const key = `${this.prefix}${sessionId}`;
    const sessionData = {
      sharedSecret: nenCrypto3.nen_to_base64(sharedSecret),
      hmacKey: nenCrypto3.nen_to_base64(hmacKey),
      createdAt: Date.now()
    };
    await this.redis.set(key, JSON.stringify(sessionData), { ex: Math.floor(this.expiryMs / 1e3) });
  }
  async get(sessionId) {
    const key = `${this.prefix}${sessionId}`;
    const dataStr = await this.redis.get(key);
    if (!dataStr) return null;
    try {
      const session = JSON.parse(dataStr);
      return {
        sharedSecret: nenCrypto3.nen_from_base64(session.sharedSecret),
        hmacKey: nenCrypto3.nen_from_base64(session.hmacKey)
      };
    } catch (e) {
      console.error("Failed to parse Nen session from Redis", e);
      return null;
    }
  }
  async delete(sessionId) {
    const key = `${this.prefix}${sessionId}`;
    const result = await this.redis.del(key);
    return result > 0;
  }
  async exists(sessionId) {
    const key = `${this.prefix}${sessionId}`;
    const result = await this.redis.exists(key);
    return result > 0;
  }
  async hasNonce(sessionId, nonce) {
    const key = `${this.prefix}${sessionId}:nonces`;
    const result = await this.redis.sismember(key, nonce);
    return result > 0;
  }
  async trackNonce(sessionId, nonce) {
    const key = `${this.prefix}${sessionId}:nonces`;
    await this.redis.sadd(key, nonce);
    await this.redis.expire(key, Math.floor(this.expiryMs / 1e3));
  }
};

// src/store/upstash.ts
var nenCrypto4 = __toESM(require("core-crypto"));
var UpstashSessionStore = class {
  url;
  token;
  prefix;
  ttlSeconds;
  constructor(restUrl, restToken, prefix = "nen:session:", ttlSeconds = 3600) {
    this.url = restUrl.replace(/\/$/, "");
    this.token = restToken;
    this.prefix = prefix;
    this.ttlSeconds = ttlSeconds;
  }
  /** Send a single Redis command to the Upstash REST endpoint. */
  async cmd(command) {
    const res = await fetch(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(command)
    });
    if (!res.ok) {
      throw new Error(`Upstash REST request failed: ${res.status} ${res.statusText}`);
    }
    const json = await res.json();
    if (json.error) {
      throw new Error(`Upstash error: ${json.error}`);
    }
    return json.result;
  }
  async set(sessionId, sharedSecret, hmacKey) {
    const key = `${this.prefix}${sessionId}`;
    const sessionData = JSON.stringify({
      sharedSecret: nenCrypto4.nen_to_base64(sharedSecret),
      hmacKey: nenCrypto4.nen_to_base64(hmacKey),
      createdAt: Date.now()
    });
    await this.cmd(["SET", key, sessionData, "EX", this.ttlSeconds]);
  }
  async get(sessionId) {
    const key = `${this.prefix}${sessionId}`;
    const dataStr = await this.cmd(["GET", key]);
    if (!dataStr) return null;
    try {
      const session = JSON.parse(dataStr);
      return {
        sharedSecret: nenCrypto4.nen_from_base64(session.sharedSecret),
        hmacKey: nenCrypto4.nen_from_base64(session.hmacKey)
      };
    } catch (e) {
      console.error("Failed to parse Nen session from Upstash", e);
      return null;
    }
  }
  async delete(sessionId) {
    const result = await this.cmd(["DEL", `${this.prefix}${sessionId}`]);
    return result > 0;
  }
  async exists(sessionId) {
    const result = await this.cmd(["EXISTS", `${this.prefix}${sessionId}`]);
    return result > 0;
  }
  async hasNonce(sessionId, nonce) {
    const key = `${this.prefix}${sessionId}:nonces`;
    const result = await this.cmd(["SISMEMBER", key, nonce]);
    return result > 0;
  }
  async trackNonce(sessionId, nonce) {
    const key = `${this.prefix}${sessionId}:nonces`;
    await this.cmd(["SADD", key, nonce]);
    await this.cmd(["EXPIRE", key, this.ttlSeconds]);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  InMemorySessionStore,
  NEN_ERRORS,
  NenError,
  RedisSessionStore,
  UpstashSessionStore,
  decryptPayload,
  deleteSession,
  describeNenCode,
  encryptPayload,
  getSession,
  getSessionStore,
  handleHandshake,
  handleRotate,
  handleStatus,
  handleTerminate,
  sessionExists,
  setSessionStore,
  storeSession,
  withNen,
  withNenStream
});
