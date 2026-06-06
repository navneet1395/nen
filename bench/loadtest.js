// Concurrency / load test: answers "how many concurrent encrypted requests can
// the service sustain, and where does it saturate?"
//
// For each concurrency level C we keep exactly C encrypted requests in flight
// (drawn from a pool of C handshaken clients) until REQUESTS_PER_LEVEL complete,
// then record latency percentiles, throughput, error rate, and server RSS.
//
// Run standalone:  TARGET_URL=http://localhost:3005 node bench/loadtest.js
const { newClient, mapLimit, serverStats, TARGET } = require('./lib/flow');
const { summarize } = require('./lib/stats');
const { newRunDir, saveJSON } = require('./lib/io');

// macOS default open-file limit is low (often 256); keep levels socket-safe.
const LEVELS = (process.env.LEVELS && process.env.LEVELS.split(',').map(Number)) || [10, 25, 50, 100, 150, 200];
const REQUESTS_PER_LEVEL = Number(process.env.REQUESTS_PER_LEVEL || 1000);

async function handshakePool(size) {
  const clients = [];
  const latencies = [];
  // Handshake in capped batches to avoid socket exhaustion.
  await mapLimit(Array.from({ length: size }), 40, async () => {
    const c = newClient();
    const t0 = performance.now();
    await c.handshake();
    latencies.push(performance.now() - t0);
    clients.push(c);
  });
  return { clients, handshake: summarize(latencies) };
}

async function runLevel(concurrency) {
  const { clients, handshake } = await handshakePool(concurrency);

  const latencies = [];
  let errors = 0;
  let counter = 0;
  const rssBefore = await serverStats();

  const t0 = performance.now();
  await mapLimit(Array.from({ length: REQUESTS_PER_LEVEL }), concurrency, async (_v, i) => {
    const client = clients[i % clients.length];
    const rt0 = performance.now();
    try {
      const r = await client.pqcfetch('/api/notes', {
        method: 'POST',
        body: JSON.stringify({ title: 'load', content: `c${concurrency}-#${counter++}` }),
      });
      if (!r || r.ok !== true || !r.note) errors++;
      else latencies.push(performance.now() - rt0);
    } catch {
      errors++;
    }
  });
  const totalMs = performance.now() - t0;
  const rssAfter = await serverStats();

  await Promise.all(clients.map((c) => c.terminate().catch(() => {})));

  const throughput = +(REQUESTS_PER_LEVEL / (totalMs / 1000)).toFixed(2);
  const result = {
    concurrency,
    requests: REQUESTS_PER_LEVEL,
    errors,
    errorRate: +((errors / REQUESTS_PER_LEVEL) * 100).toFixed(2),
    totalMs: +totalMs.toFixed(1),
    throughputReqPerSec: throughput,
    latencyMs: summarize(latencies),
    handshakeMs: handshake,
    serverRssMB: { before: rssBefore?.memory?.rssMB ?? null, after: rssAfter?.memory?.rssMB ?? null },
  };
  console.log(
    `C=${String(concurrency).padStart(4)}  ${throughput.toFixed(0).padStart(5)} req/s  ` +
    `p50=${result.latencyMs.p50}ms p99=${result.latencyMs.p99}ms  err=${result.errorRate}%  ` +
    `rss=${result.serverRssMB.after}MB`
  );
  return result;
}

async function run() {
  console.log(`Load test against ${TARGET} — levels [${LEVELS}], ${REQUESTS_PER_LEVEL} req/level\n`);
  const levels = [];
  for (const c of LEVELS) levels.push(await runLevel(c));

  // Saturation = level with peak throughput; flag where error rate climbs.
  const peak = levels.reduce((a, b) => (b.throughputReqPerSec > a.throughputReqPerSec ? b : a));
  const firstErrors = levels.find((l) => l.errorRate > 1);
  const summary = {
    suite: 'loadtest',
    target: TARGET,
    requestsPerLevel: REQUESTS_PER_LEVEL,
    levels,
    peakThroughput: { concurrency: peak.concurrency, reqPerSec: peak.throughputReqPerSec, p99Ms: peak.latencyMs.p99 },
    saturationConcurrency: peak.concurrency,
    firstErrorsAtConcurrency: firstErrors ? firstErrors.concurrency : null,
  };
  console.log(`\nPeak: ${peak.throughputReqPerSec} req/s at C=${peak.concurrency} (p99 ${peak.latencyMs.p99}ms)`);

  if (require.main === module) {
    const { dir } = newRunDir();
    saveJSON(dir, 'loadtest.json', summary);
    console.log(`Saved -> ${dir}/loadtest.json`);
  }
  return summary;
}

if (require.main === module) {
  run().catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { run };
