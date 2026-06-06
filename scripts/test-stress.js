const { IsogenyClient, createPqcFetch } = require('../packages/isogeny-client/dist/index.js');
const isogenyCrypto = require('core-crypto');

const TARGET_URL = 'http://localhost:3005';
const CONCURRENT_USERS = 100;
const REQUESTS_PER_USER = 5;

async function simulateUser(userId) {
  const pqcfetch = createPqcFetch(TARGET_URL);
  
  const latencies = [];
  
  for (let i = 0; i < REQUESTS_PER_USER; i++) {
    const start = performance.now();
    const res = await pqcfetch('/api/secure-data', {
      method: 'POST',
      body: JSON.stringify({ request: `Stress Test User ${userId} Request ${i}` })
    });
    
    if (!res.received || !res.received.request.includes('Stress Test User')) {
      throw new Error(`User ${userId} failed on request ${i}`);
    }
    latencies.push(performance.now() - start);
  }
  
  return latencies;
}

async function runStressTest() {
  console.log('==========================================');
  console.log('   ISOGENY SDK STRESS & PROFILE TEST');
  console.log('==========================================\n');
  console.log(`Simulating ${CONCURRENT_USERS} concurrent users, ${REQUESTS_PER_USER} requests each...`);

  const start = performance.now();
  
  const userPromises = [];
  for (let i = 0; i < CONCURRENT_USERS; i++) {
    userPromises.push(simulateUser(i));
  }
  
  const results = await Promise.all(userPromises);
  const totalTime = performance.now() - start;
  
  const allLatencies = results.flat();
  const avgLatency = allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length;
  const maxLatency = Math.max(...allLatencies);
  const minLatency = Math.min(...allLatencies);
  
  console.log(`\n[PASS] Successfully handled ${CONCURRENT_USERS * REQUESTS_PER_USER} encrypted requests!`);
  console.log(`       Total time: ${totalTime.toFixed(2)}ms`);
  console.log(`       Average Latency: ${avgLatency.toFixed(2)}ms`);
  console.log(`       Min Latency: ${minLatency.toFixed(2)}ms`);
  console.log(`       Max Latency: ${maxLatency.toFixed(2)}ms`);
  console.log(`       Throughput: ${((CONCURRENT_USERS * REQUESTS_PER_USER) / (totalTime / 1000)).toFixed(2)} req/s\n`);

  console.log('==========================================');
  console.log('     STRESS TESTS COMPLETE - 100%');
  console.log('==========================================');
}

runStressTest().catch(err => {
  console.error('\n[FAIL] Stress Test Failed:', err);
  process.exit(1);
});
