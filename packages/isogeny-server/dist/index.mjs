// src/middleware.ts
import * as isogenyCrypto from "core-crypto";

// src/store.ts
var globalStore = globalThis;
if (!globalStore.__ISOGENY_SESSIONS) {
  globalStore.__ISOGENY_SESSIONS = /* @__PURE__ */ new Map();
}
var sessionStore = globalStore.__ISOGENY_SESSIONS;
var EXPIRY_MS = 1e3 * 60 * 60;
function storeSession(sessionId, sharedSecret) {
  sessionStore.set(sessionId, {
    sharedSecret,
    createdAt: Date.now()
  });
}
function getSession(sessionId) {
  const session = sessionStore.get(sessionId);
  if (!session) return null;
  if (Date.now() - session.createdAt > EXPIRY_MS) {
    sessionStore.delete(sessionId);
    return null;
  }
  return session.sharedSecret;
}
function deleteSession(sessionId) {
  return sessionStore.delete(sessionId);
}
function sessionExists(sessionId) {
  const session = sessionStore.get(sessionId);
  if (!session) return false;
  if (Date.now() - session.createdAt > EXPIRY_MS) {
    sessionStore.delete(sessionId);
    return false;
  }
  return true;
}
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessionStore.entries()) {
    if (now - session.createdAt > EXPIRY_MS) {
      sessionStore.delete(id);
    }
  }
}, 1e3 * 60 * 5).unref?.();

// src/middleware.ts
async function handleHandshake(req) {
  try {
    const body = await req.json();
    if (!body.publicKey || !Array.isArray(body.publicKey)) {
      return new Response(JSON.stringify({ error: "Invalid publicKey format" }), { status: 400 });
    }
    const pkBytes = new Uint8Array(body.publicKey);
    const encap = isogenyCrypto.isogeny_encapsulate(pkBytes);
    const sessionId = crypto.randomUUID();
    storeSession(sessionId, encap.shared_secret);
    return new Response(JSON.stringify({
      sessionId,
      ciphertext: Array.from(encap.ciphertext)
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Handshake failed" }), { status: 500 });
  }
}
async function handleTerminate(req) {
  const sessionId = req.headers.get("X-Isogeny-Session");
  if (sessionId) {
    deleteSession(sessionId);
  }
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
async function handleStatus(req) {
  const sessionId = req.headers.get("X-Isogeny-Session");
  if (!sessionId || !sessionExists(sessionId)) {
    return new Response(JSON.stringify({ valid: false }), { status: 401 });
  }
  return new Response(JSON.stringify({ valid: true }), { status: 200 });
}
function decryptPayload(sessionId, encryptedData) {
  const sharedSecret = getSession(sessionId);
  if (!sharedSecret) {
    throw new Error("Invalid or expired session");
  }
  const nonceBytes = new Uint8Array(encryptedData.nonce);
  const ctBytes = new Uint8Array(encryptedData.ciphertext);
  try {
    return isogenyCrypto.isogeny_decrypt(sharedSecret, nonceBytes, ctBytes);
  } catch (e) {
    console.error("Decryption failed", e);
    return null;
  }
}
function encryptPayload(sessionId, plaintext) {
  const sharedSecret = getSession(sessionId);
  if (!sharedSecret) {
    throw new Error("Invalid or expired session");
  }
  const nonce = isogenyCrypto.isogeny_generate_nonce();
  const ciphertext = isogenyCrypto.isogeny_encrypt(sharedSecret, nonce, plaintext);
  return {
    ciphertext: Array.from(ciphertext),
    nonce: Array.from(nonce)
  };
}

// src/wrapper.ts
function withIsogeny(handler) {
  return async (req) => {
    try {
      const sessionId = req.headers.get("X-Isogeny-Session");
      if (!sessionId) {
        return new Response(JSON.stringify({ error: "Missing X-Isogeny-Session header" }), { status: 401 });
      }
      const encryptedData = await req.json();
      if (!encryptedData.ciphertext || !encryptedData.nonce) {
        return new Response(JSON.stringify({ error: "Invalid encrypted payload format" }), { status: 400 });
      }
      const decryptedBytes = decryptPayload(sessionId, encryptedData);
      if (!decryptedBytes) {
        return new Response(JSON.stringify({ error: "Decryption failed or session invalid" }), { status: 401 });
      }
      const plaintextString = new TextDecoder().decode(decryptedBytes);
      let decryptedBody;
      try {
        decryptedBody = JSON.parse(plaintextString);
      } catch (e) {
        return new Response(JSON.stringify({ error: "Decrypted payload is not valid JSON" }), { status: 400 });
      }
      const result = await handler(req, decryptedBody);
      const responseString = JSON.stringify(result);
      const responseBytes = new TextEncoder().encode(responseString);
      const encryptedResponse = encryptPayload(sessionId, responseBytes);
      return new Response(JSON.stringify(encryptedResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (err) {
      if (err.message === "Invalid or expired session") {
        return new Response(JSON.stringify({ error: "Invalid or expired session" }), { status: 401 });
      }
      console.error("Isogeny Wrapper Error:", err);
      return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
  };
}
export {
  decryptPayload,
  encryptPayload,
  getSession,
  handleHandshake,
  handleStatus,
  handleTerminate,
  storeSession,
  withIsogeny
};
