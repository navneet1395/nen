// Functional + security regression suite for the Isogeny SDK, driving the
// encrypted CRUD demo app (apps/www/src/app/api/notes/*) the documented way.
//
// Run standalone:  TARGET_URL=http://localhost:3005 node bench/regression.js
const { newClient, crudLifecycle, rawRequest, TARGET } = require('./lib/flow');
const { newRunDir, saveJSON } = require('./lib/io');

async function run() {
  const tests = [];
  const record = (name, pass, detail) => {
    tests.push({ name, pass, detail });
    console.log(`${pass ? '[PASS]' : '[FAIL]'} ${name}${detail ? ' — ' + detail : ''}`);
  };

  const client = newClient();

  // 1. Handshake + status
  try {
    await client.handshake();
    const alive = await client.status();
    record('handshake + status', !!(client.sessionId && client.sharedSecret && client.hmacKey && alive), `session ${client.sessionId}`);
  } catch (e) {
    record('handshake + status', false, e.message);
    // Cannot continue without a session.
    return finalize(tests);
  }

  // 2. Full CRUD lifecycle (create/read/update/search/delete)
  const life = await crudLifecycle(client);
  for (const s of life.steps) {
    record(`crud:${s.name} (${s.ms}ms)`, s.ok, s.err);
  }

  // 3. Read-after-delete returns not_found (logical correctness)
  try {
    const created = await client.pqcfetch('/api/notes', { method: 'POST', body: JSON.stringify({ title: 't', content: 'c' }) });
    const id = created.note.id;
    await client.pqcfetch(`/api/notes/${id}`, { method: 'DELETE', body: '{}' });
    const after = await client.pqcfetch(`/api/notes/${id}`, { method: 'POST', body: '{}' });
    record('read-after-delete -> not_found', after && after.ok === false && after.error === 'not_found');
  } catch (e) {
    record('read-after-delete -> not_found', false, e.message);
  }

  // 4. SECURITY: tampered HMAC signature must be rejected (401)
  try {
    const res = await rawRequest(client, '/api/notes/search', { query: 'x' }, { tamper: true });
    record('tampered HMAC rejected (401)', res.status === 401, `got HTTP ${res.status}`);
  } catch (e) {
    record('tampered HMAC rejected (401)', false, e.message);
  }

  // 5. SECURITY: replay of a valid request (same nonce+timestamp+signature)
  try {
    const fixedNonce = require('core-crypto').isogeny_generate_nonce();
    const ts = Date.now();
    const first = await rawRequest(client, '/api/notes/search', { query: 'x' }, { nonce: fixedNonce, timestamp: ts });
    const replay = await rawRequest(client, '/api/notes/search', { query: 'x' }, { nonce: fixedNonce, timestamp: ts });
    // Pass if the replayed request is rejected. If it succeeds, nonce-replay
    // detection is NOT active for the default in-memory store (a finding).
    const rejected = replay.status !== 200;
    record('replay rejected (nonce reuse)', rejected, rejected ? `replay HTTP ${replay.status}` : `WEAKNESS: in-memory store accepted replay (first=${first.status}, replay=${replay.status})`);
  } catch (e) {
    record('replay rejected (nonce reuse)', false, e.message);
  }

  // 6. SECURITY: requests on a terminated session are rejected
  try {
    const dead = newClient();
    await dead.handshake();
    // Snapshot crypto material BEFORE terminate() wipes it from the client.
    const staleSid        = dead.sessionId;
    const staleShared     = dead.sharedSecret;
    const staleHmac       = dead.hmacKey;
    await dead.terminate();
    // Inject stale keys back so rawRequest can sign & encrypt, but the server
    // should reject because the session no longer exists in its store.
    dead.sharedSecret = staleShared;
    dead.hmacKey      = staleHmac;
    const res = await rawRequest(dead, '/api/notes/search', { query: 'x' }, { sessionId: staleSid });
    record('terminated session rejected', res.status !== 200, `HTTP ${res.status}`);
  } catch (e) {
    record('terminated session rejected', false, e.message);
  }

  // 7. NEN-PROTOCOL-V2: an encrypted GET round-trips (no request body, the
  // request is still authenticated, and the response is decrypted). This used to
  // be impossible in V1 (the nonce lived in the body); the nonce now travels in
  // the X-Nen-Nonce header, so bodyless methods work.
  let getRoundTrips = false;
  try {
    const r = await client.nenFetch('/api/notes', { method: 'GET' });
    // nenFetch returns the decrypted object on success, or a raw Response on a
    // non-OK status. A successful encrypted GET yields a decrypted `{ ok: true }`.
    getRoundTrips = !!(r && r.ok === true && Array.isArray(r.notes));
  } catch {
    getRoundTrips = false;
  }
  record('encrypted GET round-trips (V2 bidirectional)', getRoundTrips,
    `decrypted GET response ok=${getRoundTrips}`);

  await client.terminate().catch(() => {});
  return finalize(tests);
}

function finalize(tests) {
  const passed = tests.filter((t) => t.pass).length;
  const summary = { suite: 'regression', total: tests.length, passed, failed: tests.length - passed, tests };
  console.log(`\nRegression: ${passed}/${tests.length} passed.`);
  if (require.main === module) {
    const { dir } = newRunDir();
    saveJSON(dir, 'regression.json', summary);
    console.log(`Saved -> ${dir}/regression.json`);
  }
  return summary;
}

if (require.main === module) {
  run().catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { run };
