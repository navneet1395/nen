/**
 * Pluggable SessionStore interface.
 * The default implementation uses an in-memory Map with globalThis binding
 * to survive Next.js HMR. Users can implement this interface to plug in
 * Redis, Cloudflare KV, Upstash, or any other backend.
 *
 * NEN-PROTOCOL-V3: the store holds the two DERIVED keys — `encKey` (ChaCha20)
 * and `macKey` (HMAC) — both produced locally via HKDF from the ML-KEM shared
 * secret at handshake. Neither key is ever transmitted (see PROTOCOL.md §3,
 * KEY_SCHEDULE.md). This replaces the V2 shape `{ sharedSecret, hmacKey }`
 * where the MAC key was a random value shipped in plaintext.
 */
export interface SessionStore {
  get(sessionId: string): { encKey: Uint8Array; macKey: Uint8Array } | null | Promise<{ encKey: Uint8Array; macKey: Uint8Array } | null>;
  set(sessionId: string, encKey: Uint8Array, macKey: Uint8Array, ttlMs?: number): void | Promise<void>;
  delete(sessionId: string): boolean | Promise<boolean>;
  exists(sessionId: string): boolean | Promise<boolean>;
  hasNonce?(sessionId: string, nonce: string): boolean | Promise<boolean>;
  trackNonce?(sessionId: string, nonce: string): void | Promise<void>;
}

// ---------------------------------------------------------------------------
// Default In-Memory Implementation
// ---------------------------------------------------------------------------

interface SessionEntry {
  encKey: Uint8Array;
  macKey: Uint8Array;
  createdAt: number;
  usedNonces: Set<string>;
}

const globalStore = globalThis as unknown as {
  __ISOGENY_SESSIONS: Map<string, SessionEntry>;
};

if (!globalStore.__ISOGENY_SESSIONS) {
  globalStore.__ISOGENY_SESSIONS = new Map();
}

const sessionStore = globalStore.__ISOGENY_SESSIONS;

const DEFAULT_EXPIRY_MS = 1000 * 60 * 60; // 1 hour

export class InMemorySessionStore implements SessionStore {
  private expiryMs: number;

  constructor(expiryMs: number = DEFAULT_EXPIRY_MS) {
    this.expiryMs = expiryMs;
  }

  set(sessionId: string, encKey: Uint8Array, macKey: Uint8Array): void {
    sessionStore.set(sessionId, {
      encKey,
      macKey,
      createdAt: Date.now(),
      usedNonces: new Set(),
    });
  }

  get(sessionId: string): { encKey: Uint8Array; macKey: Uint8Array } | null {
    const session = sessionStore.get(sessionId);
    if (!session) return null;
    if (Date.now() - session.createdAt > this.expiryMs) {
      sessionStore.delete(sessionId);
      return null;
    }
    return { encKey: session.encKey, macKey: session.macKey };
  }

  delete(sessionId: string): boolean {
    return sessionStore.delete(sessionId);
  }

  exists(sessionId: string): boolean {
    const session = sessionStore.get(sessionId);
    if (!session) return false;
    if (Date.now() - session.createdAt > this.expiryMs) {
      sessionStore.delete(sessionId);
      return false;
    }
    return true;
  }

  hasNonce(sessionId: string, nonce: string): boolean {
    const session = sessionStore.get(sessionId);
    if (!session) return false;
    return session.usedNonces.has(nonce);
  }

  trackNonce(sessionId: string, nonce: string): void {
    const session = sessionStore.get(sessionId);
    if (session) {
      session.usedNonces.add(nonce);
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton instance (default store used by middleware)
// ---------------------------------------------------------------------------

let _activeStore: SessionStore = new InMemorySessionStore();

/** Replace the default session store with a custom implementation (e.g. Redis). */
export function setSessionStore(store: SessionStore): void {
  _activeStore = store;
}

/** Get the active session store instance. */
export function getSessionStore(): SessionStore {
  return _activeStore;
}

// ---------------------------------------------------------------------------
// Convenience helpers (delegate to active store)
// ---------------------------------------------------------------------------

export function storeSession(sessionId: string, encKey: Uint8Array, macKey: Uint8Array) {
  return _activeStore.set(sessionId, encKey, macKey);
}

export function getSession(sessionId: string) {
  return _activeStore.get(sessionId);
}

export function deleteSession(sessionId: string) {
  return _activeStore.delete(sessionId);
}

export function sessionExists(sessionId: string) {
  return _activeStore.exists(sessionId);
}

// ---------------------------------------------------------------------------
// Cleanup interval (prevents memory leaks in long-running Node processes)
// ---------------------------------------------------------------------------
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessionStore.entries()) {
    if (now - session.createdAt > DEFAULT_EXPIRY_MS) {
      sessionStore.delete(id);
    }
  }
}, 1000 * 60 * 5).unref?.();
