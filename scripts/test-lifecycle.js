const { IsogenyClient } = require('../packages/isogeny-client/dist/index.js');

const TARGET_URL = 'http://localhost:3000';

async function runLifecycleTest() {
  console.log('==========================================');
  console.log('   ISOGENY SDK LIFECYCLE & DX TEST');
  console.log('==========================================\n');

  const client = new IsogenyClient(TARGET_URL);

  // 1. Initial Handshake
  console.log('[TEST 1] Initiating ML-KEM Handshake...');
  const hsStart = performance.now();
  await client.handshake();
  console.log(`[PASS] Handshake successful! Session ID: ${client.sessionId}`);
  console.log(`       Time: ${(performance.now() - hsStart).toFixed(2)}ms\n`);

  // 2. Check Status
  console.log('[TEST 2] Checking Session Status...');
  let isAlive = await client.status();
  if (!isAlive) throw new Error("Session should be alive!");
  console.log(`[PASS] Status is ALIVE.\n`);

  // 3. Normal Encrypted Fetch
  console.log('[TEST 3] Testing Encrypted DX Wrapper (/api/secure-data)...');
  const payload1 = { request: 'Normal Data' };
  const res1 = await client.pqcfetch('/api/secure-data', {
    method: 'POST',
    body: JSON.stringify(payload1)
  });
  if (!res1.received || res1.received.request !== 'Normal Data') {
    throw new Error('Failed to decrypt and echo data correctly');
  }
  console.log(`[PASS] Secure Fetch successful!\n`);

  // 4. Terminate Session
  console.log('[TEST 4] Terminating Session...');
  await client.terminate();
  console.log(`[PASS] client.terminate() executed.\n`);

  // 5. Check Status Again
  console.log('[TEST 5] Checking Session Status post-termination...');
  isAlive = await client.status();
  if (isAlive) throw new Error("Session should be dead!");
  console.log(`[PASS] Status is correctly DEAD.\n`);

  // 6. Test Auto-Rotation (The magic DX feature)
  console.log('[TEST 6] Triggering Auto-Recovery on Expired Session...');
  
  // We manually set a fake old session ID to simulate an expired session
  client.sessionId = '11111111-2222-3333-4444-555555555555';
  client.sharedSecret = new Uint8Array(32); // Fake secret
  
  const res2 = await client.pqcfetch('/api/secure-data', {
    method: 'POST',
    body: JSON.stringify({ request: 'Auto-Recovered Data' })
  });

  if (!res2.received || res2.received.request !== 'Auto-Recovered Data') {
    throw new Error('Auto-recovery failed to return the correct data');
  }
  
  console.log(`[PASS] Client intercepted 401, automatically rotated keys, and retried!`);
  console.log(`       New Session ID: ${client.sessionId}\n`);

  console.log('==========================================');
  console.log('     LIFECYCLE TESTS COMPLETE - 100%');
  console.log('==========================================');
}

runLifecycleTest().catch(err => {
  console.error('\n[FAIL] Test Failed:', err);
  process.exit(1);
});
