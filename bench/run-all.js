// Orchestrator: waits for the demo server, runs regression + load + profile,
// then writes a timestamped run dir with raw JSON, a human REPORT.md, a machine
// summary.json, and a marketing-summary.json ready for the website.
//
//   1) start the demo app:   cd apps/www && npx next dev -p 3005   (or build+start)
//   2) run:                   TARGET_URL=http://localhost:3005 node bench/run-all.js
const { serverStats, TARGET } = require('./lib/flow');
const { newRunDir, saveJSON, saveText, mirrorLatest } = require('./lib/io');
const regression = require('./regression');
const loadtest = require('./loadtest');
const profile = require('./profile');
const scenarios = require('./scenarios');

async function waitForServer(timeoutMs = 120000) {
  const start = Date.now();
  process.stdout.write(`Waiting for ${TARGET} `);
  while (Date.now() - start < timeoutMs) {
    if (await serverStats()) { console.log('— up.\n'); return true; }
    process.stdout.write('.');
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log('\nServer never became reachable.');
  return false;
}

function buildReport({ stamp, env, reg, load, prof }) {
  const peak = load.peakThroughput;
  const lines = [];
  lines.push(`# Isogeny — Regression & Performance Report`);
  lines.push('');
  lines.push(`**Run:** ${stamp}  `);
  lines.push(`**Target:** ${TARGET}  `);
  lines.push(`**Node:** ${env.node}  •  **Platform:** ${env.platform}  •  **CPUs:** ${env.cpus}  •  **Server RSS at start:** ${env.serverRssMB ?? 'n/a'} MB`);
  lines.push('');
  lines.push(`## 1. Regression — ${reg.passed}/${reg.total} passed`);
  lines.push('');
  lines.push('| Test | Result | Detail |');
  lines.push('|------|--------|--------|');
  for (const t of reg.tests) lines.push(`| ${t.name} | ${t.pass ? '✅ pass' : '❌ fail'} | ${(t.detail || '').replace(/\|/g, '\\|')} |`);
  lines.push('');
  lines.push(`## 2. Load / concurrency`);
  lines.push('');
  lines.push(`**Peak throughput: ${peak.reqPerSec} req/s at ${peak.concurrency} concurrent (p99 ${peak.p99Ms} ms).**  First errors at concurrency: ${load.firstErrorsAtConcurrency ?? 'none observed'}.`);
  lines.push('');
  lines.push('| Concurrency | Throughput (req/s) | p50 ms | p90 ms | p99 ms | max ms | Errors % | Server RSS MB |');
  lines.push('|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const l of load.levels) {
    lines.push(`| ${l.concurrency} | ${l.throughputReqPerSec} | ${l.latencyMs.p50} | ${l.latencyMs.p90} | ${l.latencyMs.p99} | ${l.latencyMs.max} | ${l.errorRate} | ${l.serverRssMB.after ?? 'n/a'} |`);
  }
  lines.push('');
  lines.push(`## 3. Profile`);
  lines.push('');
  lines.push(`- **Handshake (ML-KEM-768):** ${prof.handshakeMs} ms`);
  lines.push(`- **Client crypto (ChaCha20-Poly1305 encrypt+decrypt):** p50 ${prof.clientCryptoMsPerOp.p50} ms/op, p99 ${prof.clientCryptoMsPerOp.p99} ms/op`);
  lines.push('');
  lines.push('| Payload | Plaintext B | Wire B | Overhead | Round-trip p50 ms | p99 ms | Errors |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|');
  for (const s of prof.payloadScaling) {
    lines.push(`| ${s.label} | ${s.plaintextBytes} | ${s.wireBytes} | ${s.wireOverheadRatio}x | ${s.roundTripMs.p50} | ${s.roundTripMs.p99} | ${s.errors} |`);
  }
  lines.push('');
  lines.push('## 4. Weaknesses & follow-ups');
  lines.push('');
  const findings = [];
  const failed = reg.tests.filter((t) => !t.pass);
  for (const f of failed) findings.push(`Regression failure: **${f.name}** — ${f.detail || ''}`);
  const replay = reg.tests.find((t) => /replay/.test(t.name));
  if (replay && /WEAKNESS/.test(replay.detail || '')) findings.push(`Nonce-replay detection is not active for the default in-memory store — ${replay.detail}`);
  findings.push('Encrypted GET is impossible via `withIsogeny` (Fetch forbids a body on GET, the wrapper requires one). Reads must use POST/PUT/DELETE.');
  findings.push('HMAC canonical path uses `URL.pathname`; query strings are not covered — dynamic ids must travel in the path, not the query.');
  if (load.firstErrorsAtConcurrency) findings.push(`Errors begin at concurrency ${load.firstErrorsAtConcurrency} (likely client-side socket limits on this host; raise \`ulimit -n\`).`);
  for (const f of findings) lines.push(`- ${f}`);
  lines.push('');
  return lines.join('\n');
}

function buildMarketing({ stamp, env, load, prof }) {
  const peak = load.peakThroughput;
  return {
    generatedAt: stamp,
    measuredOn: { node: env.node, platform: env.platform, cpus: env.cpus, mode: 'dev-server (single instance)' },
    headline: {
      peakThroughputReqPerSec: peak.reqPerSec,
      atConcurrency: peak.concurrency,
      p99LatencyMs: peak.p99Ms,
    },
    handshakeMs: prof.handshakeMs,
    clientCryptoP50MsPerOp: prof.clientCryptoMsPerOp.p50,
    wireOverhead: prof.payloadScaling.map((s) => ({ payload: s.label, overhead: s.wireOverheadRatio, roundTripP50Ms: s.roundTripMs.p50 })),
    claims: [
      `Sustains ${peak.reqPerSec} end-to-end encrypted requests/sec on a single instance.`,
      `ML-KEM-768 handshake completes in ~${prof.handshakeMs} ms.`,
      `Post-quantum payload encryption adds only ~${prof.clientCryptoMsPerOp.p50} ms of client crypto per request.`,
      `Wire overhead stays near ${prof.payloadScaling[0].wireOverheadRatio}x of plaintext (base64 framing).`,
    ],
    disclaimer: 'Measured on a developer machine against the Next.js dev server. Production (next build/start, shared Redis store) will differ; reproduce via /bench.',
  };
}

async function run() {
  if (!(await waitForServer())) process.exit(1);
  const os = require('os');
  const start = await serverStats();
  const env = { node: process.version, platform: `${os.platform()} ${os.release()}`, cpus: os.cpus().length, serverRssMB: start?.memory?.rssMB ?? null };

  console.log('=== REGRESSION ===');
  const reg = await regression.run();
  console.log('\n=== LOAD ===');
  const load = await loadtest.run();
  console.log('\n=== PROFILE ===');
  const prof = await profile.run();
  console.log('\n=== SCENARIOS ===');
  const scen = await scenarios.run();

  const { dir, stamp } = newRunDir();
  saveJSON(dir, 'regression.json', reg);
  saveJSON(dir, 'loadtest.json', load);
  saveJSON(dir, 'profile.json', prof);
  saveJSON(dir, 'scenarios.json', scen);
  saveJSON(dir, 'summary.json', { stamp, env, regression: reg, loadtest: load, profile: prof, scenarios: scen });
  const marketing = buildMarketing({ stamp, env, load, prof });
  saveJSON(dir, 'marketing-summary.json', marketing);
  saveText(dir, 'REPORT.md', buildReport({ stamp, env, reg, load, prof }));
  
  // Save a copy directly to the website for the dashboard to use
  const fs = require('fs');
  const path = require('path');
  const wwwDataDir = path.join(__dirname, '..', 'apps', 'www', 'src', 'data');
  fs.mkdirSync(wwwDataDir, { recursive: true });
  fs.writeFileSync(path.join(wwwDataDir, 'bench-data.json'), JSON.stringify({ stamp, env, loadtest: load, profile: prof, scenarios: scen }, null, 2));

  const latest = mirrorLatest(dir);

  console.log(`\nAll results saved -> ${dir}`);
  console.log(`Latest mirror      -> ${latest}`);
  console.log(`\nRegression: ${reg.passed}/${reg.total} | Peak: ${load.peakThroughput.reqPerSec} req/s @ C=${load.peakThroughput.concurrency}`);
}

run().catch((e) => { console.error(e); process.exit(1); });
