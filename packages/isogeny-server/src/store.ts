// In-memory store for shared secrets.
// In a production environment, this should be backed by Redis or similar.

const globalStore = globalThis as unknown as {
  __ISOGENY_SESSIONS: Map<string, { sharedSecret: Uint8Array; createdAt: number }>;
};

if (!globalStore.__ISOGENY_SESSIONS) {
  globalStore.__ISOGENY_SESSIONS = new Map();
}

const sessionStore = globalStore.__ISOGENY_SESSIONS;

const EXPIRY_MS = 1000 * 60 * 60; // 1 hour

export function storeSession(sessionId: string, sharedSecret: Uint8Array) {
  sessionStore.set(sessionId, {
    sharedSecret,
    createdAt: Date.now(),
  });
}

export function getSession(sessionId: string): Uint8Array | null {
  const session = sessionStore.get(sessionId);
  if (!session) return null;

  if (Date.now() - session.createdAt > EXPIRY_MS) {
    sessionStore.delete(sessionId);
    return null;
  }

  return session.sharedSecret;
}

export function deleteSession(sessionId: string): boolean {
  return sessionStore.delete(sessionId);
}

export function sessionExists(sessionId: string): boolean {
  const session = sessionStore.get(sessionId);
  if (!session) return false;
  if (Date.now() - session.createdAt > EXPIRY_MS) {
    sessionStore.delete(sessionId);
    return false;
  }
  return true;
}

// Optional cleanup interval to prevent memory leaks in long-running processes
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessionStore.entries()) {
    if (now - session.createdAt > EXPIRY_MS) {
      sessionStore.delete(id);
    }
  }
}, 1000 * 60 * 5).unref?.();
