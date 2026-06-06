// Profile test: where does time go, and how does payload size scale?
//   - handshake vs per-request cost
//   - pure client-side crypto cost (encrypt+decrypt, no network)
//   - round-trip latency + wire overhead across payload sizes
//
// Run standalone:  TARGET_URL=http://localhost:3005 node bench/profile.js
const { newClient, crypto, TARGET } = require('./lib/flow');
const { summarize } = require('./lib/stats');
const { newRunDir, saveJSON } = require('./lib/io');

const ITERS = Number(process.env.PROFILE_ITERS || 100);
const SIZES = [
  { label: '1KB', bytes: 1024 },
  { label: '10KB', bytes: 10 * 1024 },
  { label: '100KB', bytes: 100 * 1024 },
  { label: '500KB', bytes: 500 * 1024 },
];

function payloadOf(bytes) {
  return JSON.stringify({ blob: 'x'.repeat(bytes) });
}

async function run() {
  const client = newClient();

  // Handshake cost (cold, single).
  const hs0 = performance.now();
  await client.handshake();
  const handshakeMs = +(performance.now() - hs0).toFixed(3);

  // Pure client-side crypto cost (no network): encrypt+decrypt a 1KB payload.
  const plaintext = new TextEncoder().encode(payloadOf(1024));
  const cryptoSamples = [];
  for (let i = 0; i < ITERS; i++) {
    const t0 = performance.now();
    const nonce = crypto.isogeny_generate_nonce();
    const ct = crypto.isogeny_encrypt(client.sharedSecret, nonce, plaintext);
    crypto.isogeny_decrypt(client.sharedSecret, nonce, ct);
    cryptoSamples.push(performance.now() - t0);
  }

  // Round-trip latency + wire overhead across payload sizes.
  const bySize = [];
  for (const size of SIZES) {
    const body = payloadOf(size.bytes);
    const plainBytes = Buffer.byteLength(body);
    const nonce = crypto.isogeny_generate_nonce();
    const ct = crypto.isogeny_encrypt(client.sharedSecret, nonce, new TextEncoder().encode(body));
    const wireBytes = Buffer.byteLength(
      JSON.stringify({ sessionId: client.sessionId, ct: crypto.isogeny_to_base64(ct), n: crypto.isogeny_to_base64(nonce) })
    );

    const samples = [];
    let errors = 0;
    for (let i = 0; i < ITERS; i++) {
      const t0 = performance.now();
      try {
        const r = await client.pqcfetch('/api/notes', { method: 'POST', body: JSON.stringify({ title: 's', content: body }) });
        if (!r || r.ok !== true) errors++;
        else samples.push(performance.now() - t0);
      } catch {
        errors++;
      }
    }
    bySize.push({
      label: size.label,
      plaintextBytes: plainBytes,
      wireBytes,
      wireOverheadRatio: +(wireBytes / plainBytes).toFixed(3),
      errors,
      roundTripMs: summarize(samples),
    });
    console.log(`${size.label.padEnd(6)} p50=${bySize.at(-1).roundTripMs.p50}ms p99=${bySize.at(-1).roundTripMs.p99}ms overhead=${bySize.at(-1).wireOverheadRatio}x`);
  }

  await client.terminate().catch(() => {});

  const summary = {
    suite: 'profile',
    target: TARGET,
    iters: ITERS,
    handshakeMs,
    clientCryptoMsPerOp: summarize(cryptoSamples),
    payloadScaling: bySize,
  };
  console.log(`\nHandshake: ${handshakeMs}ms | client crypto p50: ${summary.clientCryptoMsPerOp.p50}ms/op`);

  if (require.main === module) {
    const { dir } = newRunDir();
    saveJSON(dir, 'profile.json', summary);
    console.log(`Saved -> ${dir}/profile.json`);
  }
  return summary;
}

if (require.main === module) {
  run().catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { run };
