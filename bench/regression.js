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
    const sid = dead.sessionId;
    await dead.terminate();
    // Use stale keys/session id via raw request (avoids client auto-rotation).
    const res = await rawRequest(dead, '/api/notes/search', { query: 'x' }, { sessionId: sid });
    record('terminated session rejected', res.status !== 200, `HTTP ${res.status}`);
  } catch (e) {
    record('terminated session rejected', false, e.message);
  }

  // 7. LIMITATION: encrypted GET cannot complete (no body allowed on GET).
  // Documented behaviour, asserted so a future regression surfaces if it changes.
  let getBodyThrows = false;
  try {
    await fetch(`${TARGET}/api/notes`, { method: 'GET', body: '{}' });
  } catch (e) {
    getBodyThrows = /body/i.test(e.message) || /GET/i.test(e.message);
  }
  let getNoBodyRejected = false;
  try {
    const r = await client.pqcfetch('/api/notes', { method: 'GET' });
    // pqcfetch returns the raw Response on non-OK; a wrapped GET with no body
    // yields an Isogeny wire-format error (non-200).
    getNoBodyRejected = r && typeof r.status === 'number' ? r.status !== 200 : false;
  } catch {
    getNoBodyRejected = true;
  }
  record('GET-with-body limitation documented', getBodyThrows || getNoBodyRejected,
    `fetch rejects GET body=${getBodyThrows}; server rejects body-less encrypted GET=${getNoBodyRejected}`);

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
