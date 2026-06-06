// Scenarios suite: simulates real-world usage patterns including concurrent
// handshakes, key rotation under load, long-lived sessions, and multi-user bursts.
//
// Run standalone: TARGET_URL=http://localhost:3005 node bench/scenarios.js
const { newClient, crudLifecycle, mapLimit, serverStats, TARGET } = require('./lib/flow');
const { summarize } = require('./lib/stats');
const { newRunDir, saveJSON } = require('./lib/io');

async function testConcurrentHandshakes() {
  const levels = [10, 50, 100, 200];
  const results = [];
  
  for (const concurrency of levels) {
    const latencies = [];
    const t0 = performance.now();
    
    await mapLimit(Array.from({ length: concurrency }), concurrency, async () => {
      const c = newClient();
      const ht0 = performance.now();
      try {
        await c.handshake();
        latencies.push(performance.now() - ht0);
      } catch (e) {
        // Ignore failures for throughput calculation
      }
      await c.terminate().catch(() => {});
    });
    
    const totalMs = performance.now() - t0;
    const throughput = +(concurrency / (totalMs / 1000)).toFixed(2);
    
    results.push({
      concurrency,
      latencyMs: summarize(latencies),
      totalMs: +totalMs.toFixed(1),
      throughputReqPerSec: throughput
    });
    
    console.log(`Concurrent Handshakes C=${concurrency}: ${throughput} hs/s, p50=${results[results.length-1].latencyMs.p50}ms`);
  }
  
  const peak = results.reduce((a, b) => (b.throughputReqPerSec > a.throughputReqPerSec ? b : a));
  return { levels: results, peak };
}

async function testKeyRotation() {
  const concurrency = 20;
  const requestsPerClient = 100;
  const rotateEvery = 20;
  
  const normalLatencies = [];
  const rotationLatencies = [];
  let rotationsCompleted = 0;
  
  const clients = await Promise.all(Array.from({ length: concurrency }).map(async () => {
    const c = newClient();
    await c.handshake();
    return c;
  }));
  
  await mapLimit(clients, concurrency, async (client) => {
    for (let i = 1; i <= requestsPerClient; i++) {
      const t0 = performance.now();
      if (i % rotateEvery === 0) {
        try {
          await client.handshake(); // Re-key mid-session
          rotationLatencies.push(performance.now() - t0);
          rotationsCompleted++;
        } catch {}
      } else {
        try {
          const r = await client.pqcfetch('/api/notes', { method: 'POST', body: JSON.stringify({ title: 'rot', content: 'test' }) });
          if (r && r.ok) normalLatencies.push(performance.now() - t0);
        } catch {}
      }
    }
    await client.terminate().catch(() => {});
  });
  
  return {
    normalLatencyMs: summarize(normalLatencies),
    rotationLatencyMs: summarize(rotationLatencies),
    rotationsCompleted
  };
}

async function testLongLivedSession() {
  const client = newClient();
  await client.handshake();
  
  const totalRequests = 1000; // Simulated long session
  const latencies = [];
  const rssBefore = await serverStats();
  const t0 = performance.now();
  
  for (let i = 0; i < totalRequests; i++) {
    const rt0 = performance.now();
    try {
      const r = await client.pqcfetch('/api/notes', { method: 'POST', body: JSON.stringify({ title: 'long', content: 'live' }) });
      if (r && r.ok) latencies.push(performance.now() - rt0);
    } catch {}
  }
  
  const totalMs = performance.now() - t0;
  const rssAfter = await serverStats();
  await client.terminate().catch(() => {});
  
  const memGrowth = rssAfter && rssBefore ? (rssAfter.memory.rssMB - rssBefore.memory.rssMB).toFixed(2) : 0;
  
  // Split latencies into first half and second half to detect drift
  const half = Math.floor(latencies.length / 2);
  const firstHalf = summarize(latencies.slice(0, half));
  const secondHalf = summarize(latencies.slice(half));
  
  return {
    totalRequests,
    durationSec: +(totalMs / 1000).toFixed(1),
    latencyDrift: {
      firstHalfP50: firstHalf.p50,
      secondHalfP50: secondHalf.p50,
      driftMs: +(secondHalf.p50 - firstHalf.p50).toFixed(2)
    },
    memoryGrowthMB: +memGrowth
  };
}

async function testMultiUserBurst() {
  const levels = [20, 50, 100];
  const results = [];
  
  for (const concurrency of levels) {
    const t0 = performance.now();
    
    await mapLimit(Array.from({ length: concurrency }), concurrency, async () => {
      const client = newClient();
      try {
        await client.handshake();
        await crudLifecycle(client);
      } catch {}
      await client.terminate().catch(() => {});
    });
    
    const totalMs = performance.now() - t0;
    // Each user does 1 handshake + 5 requests + 1 terminate
    const aggregateThroughput = +((concurrency * 7) / (totalMs / 1000)).toFixed(2);
    
    results.push({
      concurrency,
      totalMs: +totalMs.toFixed(1),
      aggregateThroughputReqPerSec: aggregateThroughput
    });
    console.log(`Multi-User Burst C=${concurrency}: ${aggregateThroughput} req/s`);
  }
  
  return {
    levels,
    aggregateThroughput: results.reduce((max, r) => Math.max(max, r.aggregateThroughputReqPerSec), 0)
  };
}

async function testSessionChurn() {
  const concurrency = 20;
  const durationMs = 10000; // 10 seconds of pure churn
  
  let totalSessions = 0;
  let errors = 0;
  
  const t0 = performance.now();
  
  await mapLimit(Array.from({ length: concurrency }), concurrency, async () => {
    while (performance.now() - t0 < durationMs) {
      const c = newClient();
      try {
        await c.handshake();
        totalSessions++;
      } catch {
        errors++;
      }
      await c.terminate().catch(() => {});
    }
  });
  
  const elapsedMs = performance.now() - t0;
  return {
    sessionsPerSec: +(totalSessions / (elapsedMs / 1000)).toFixed(2),
    totalSessions,
    errors
  };
}

async function run() {
  console.log(`Scenarios test against ${TARGET}\n`);
  
  console.log("Running Concurrent Handshakes...");
  const concurrentHandshakes = await testConcurrentHandshakes();
  
  console.log("Running Key Rotation...");
  const keyRotation = await testKeyRotation();
  
  console.log("Running Long-Lived Session...");
  const longLivedSession = await testLongLivedSession();
  
  console.log("Running Multi-User Burst...");
  const multiUserBurst = await testMultiUserBurst();
  
  console.log("Running Session Churn...");
  const sessionChurn = await testSessionChurn();

  const summary = {
    suite: 'scenarios',
    target: TARGET,
    concurrentHandshakes,
    keyRotation,
    longLivedSession,
    multiUserBurst,
    sessionChurn
  };

  if (require.main === module) {
    const { dir } = newRunDir();
    saveJSON(dir, 'scenarios.json', summary);
    console.log(`Saved -> ${dir}/scenarios.json`);
  }
  return summary;
}

if (require.main === module) {
  run().catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { run };
