const { createPqcStream } = require('../packages/isogeny-client/dist/index.js');

const TARGET_URL = 'http://localhost:3005';

async function runStreamTest() {
  console.log('==========================================');
  console.log('   ISOGENY SDK STREAM TEST');
  console.log('==========================================\n');

  console.log('[TEST 1] Initiating auto-handshake and streaming request...');
  const pqcstream = createPqcStream(TARGET_URL);
  
  const streamStart = performance.now();
  const stream = pqcstream('/api/stream', {
    method: 'POST',
    body: JSON.stringify({ request: 'Start stream' })
  });

  let chunkCount = 0;
  for await (const chunk of stream) {
    chunkCount++;
    console.log(`[CHUNK ${chunkCount}] Decrypted: ${chunk}`);
  }

  console.log(`\n[PASS] Streaming successful! Received ${chunkCount} chunks.`);
  console.log(`       Total time: ${(performance.now() - streamStart).toFixed(2)}ms\n`);

  console.log('==========================================');
  console.log('     STREAM TESTS COMPLETE - 100%');
  console.log('==========================================');
}

runStreamTest().catch(err => {
  console.error('\n[FAIL] Test Failed:', err);
  process.exit(1);
});
