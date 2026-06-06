// Shared driver: exercises the Isogeny SDK exactly the way the docs prescribe
// (handshake -> pqcfetch), plus a few raw-crypto helpers used by the negative
// regression tests (tampered HMAC, replay, dead session).
const { IsogenyClient } = require('../../packages/isogeny-client/dist/index.js');
const crypto = require('core-crypto');

const TARGET = process.env.TARGET_URL || 'http://localhost:3005';

function newClient(target = TARGET) {
  return new IsogenyClient(target);
}

const enc = (o) => new TextEncoder().encode(JSON.stringify(o));
const now = () => performance.now();

/**
 * Full CRUD lifecycle over an already-handshaken client, using the documented
 * pqcfetch API. Returns per-step latency + correctness so the regression suite
 * can assert and the load test can time it.
 */
async function crudLifecycle(client) {
  const steps = [];
  const time = async (name, fn, check) => {
    const t0 = now();
    let res, ok, err;
    try {
      res = await fn();
      ok = check ? !!check(res) : true;
    } catch (e) {
      ok = false;
      err = e.message;
    }
    steps.push({ name, ms: +(now() - t0).toFixed(3), ok, err });
    return res;
  };

  const created = await time(
    'create',
    () =>
      client.pqcfetch('/api/notes', {
        method: 'POST',
        body: JSON.stringify({ title: 'load', content: 'secret-payload' }),
      }),
    (r) => r && r.ok && r.note && r.note.id
  );
  const id = created && created.note && created.note.id;

  await time(
    'read',
    () => client.pqcfetch(`/api/notes/${id}`, { method: 'POST', body: '{}' }),
    (r) => r && r.ok && r.note && r.note.id === id
  );
  await time(
    'update',
    () =>
      client.pqcfetch(`/api/notes/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ content: 'updated-secret' }),
      }),
    (r) => r && r.ok && r.note && r.note.content === 'updated-secret'
  );
  await time(
    'search',
    () =>
      client.pqcfetch('/api/notes/search', {
        method: 'POST',
        body: JSON.stringify({ query: 'load' }),
      }),
    (r) => r && r.ok && r.count >= 1
  );
  await time(
    'delete',
    () => client.pqcfetch(`/api/notes/${id}`, { method: 'DELETE', body: '{}' }),
    (r) => r && r.ok && r.deleted === true
  );

  const ok = steps.every((s) => s.ok);
  return { ok, steps };
}

/**
 * Craft a raw encrypted request, optionally tampering the signature, reusing a
 * fixed nonce/timestamp (for replay tests), or using a stale session id.
 * Returns the raw fetch Response.
 */
async function rawRequest(client, endpoint, payloadObj, opts = {}) {
  const method = opts.method || 'POST';
  const nonce = opts.nonce || crypto.isogeny_generate_nonce();
  const ct = crypto.isogeny_encrypt(client.sharedSecret, nonce, enc(payloadObj));
  const nB64 = crypto.isogeny_to_base64(nonce);
  const sessionId = opts.sessionId || client.sessionId;
  const timestamp = (opts.timestamp || Date.now()).toString();

  const hmacKey = opts.tamper ? new Uint8Array(32) : client.hmacKey;
  const canonical = `${method}\n${endpoint}\n${timestamp}\n${nB64}`;
  const sig = crypto.isogeny_hmac_sign(hmacKey, new TextEncoder().encode(canonical));

  return fetch(`${client.serverUrl || TARGET}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Isogeny-Session': sessionId,
      'X-Isogeny-Timestamp': timestamp,
      'X-Isogeny-Signature': crypto.isogeny_to_base64(sig),
    },
    body: JSON.stringify({ sessionId, ct: crypto.isogeny_to_base64(ct), n: nB64 }),
  });
}

/** Run async `fn` over `items` with at most `limit` in flight (socket safety). */
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function serverStats(target = TARGET) {
  try {
    const r = await fetch(`${target}/api/_bench/stats`);
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

module.exports = {
  TARGET,
  crypto,
  newClient,
  crudLifecycle,
  rawRequest,
  mapLimit,
  serverStats,
  enc,
};
