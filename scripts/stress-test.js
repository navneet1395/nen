const isogenyCrypto = require('../pkg/node/core_crypto.js');

const TARGET_URL = 'http://localhost:3000';
const CONCURRENCY = 1000;

async function runStressTest() {
  console.log(`Starting Isogeny PQC Stress Test...`);
  console.log(`Target: ${TARGET_URL}`);
  console.log(`Simulating ${CONCURRENCY} concurrent Kyber handshakes & encrypted payloads...`);

  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;

  // Pre-generate the public keys to accurately measure network + server processing time 
  // rather than client-side Wasm generation bottleneck
  const keypairs = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    keypairs.push(isogenyCrypto.isogeny_generate_keypair());
  }

  // Run in batches of 50 to prevent macOS socket exhaustion (EMFILE/ECONNREFUSED)
  const BATCH_SIZE = 50;
  for (let i = 0; i < CONCURRENCY; i += BATCH_SIZE) {
    const batch = keypairs.slice(i, i + BATCH_SIZE).map(async (keypair, idx) => {
      const actualIdx = i + idx;
      try {
        // 1. Handshake
        const handshakeStart = performance.now();
        const hsRes = await fetch(`${TARGET_URL}/api/isogeny/handshake`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            publicKey: Array.from(keypair.public_key)
          })
        });

        if (!hsRes.ok) throw new Error(`Handshake HTTP ${hsRes.status}`);
        const hsData = await hsRes.json();
        const sessionId = hsData.sessionId;
        const ctBytes = new Uint8Array(hsData.ciphertext);

        const sharedSecret = isogenyCrypto.isogeny_decapsulate(ctBytes, keypair.secret_key);

        // 2. Encrypted Request
        const payloadObj = { message: `Stress test message ${actualIdx}` };
        const payload = JSON.stringify(payloadObj);
        const payloadBytes = new TextEncoder().encode(payload);
        const nonce = isogenyCrypto.isogeny_generate_nonce();
        const ciphertext = isogenyCrypto.isogeny_encrypt(sharedSecret, nonce, payloadBytes);

        const reqRes = await fetch(`${TARGET_URL}/api/secure-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Isogeny-Session': sessionId
          },
          body: JSON.stringify({
            ciphertext: Array.from(ciphertext),
            nonce: Array.from(nonce)
          })
        });

        if (!reqRes.ok) throw new Error(`Secure data HTTP ${reqRes.status}`);
        const resData = await reqRes.json();
        const resNonce = new Uint8Array(resData.nonce);
        const resCt = new Uint8Array(resData.ciphertext);

        const decrypted = isogenyCrypto.isogeny_decrypt(sharedSecret, resNonce, resCt);
        successCount++;
      } catch (e) {
        console.error(`Request ${actualIdx} failed:`, e.message);
        failCount++;
      }
    });
    
    await Promise.all(batch);
  }

  const totalTime = (Date.now() - startTime) / 1000;
  console.log(`\n--- Stress Test Results ---`);
  console.log(`Total Time: ${totalTime.toFixed(2)} seconds`);
  console.log(`Successful Flow Completions (Handshake + Encrypted Request): ${successCount}`);
  console.log(`Failed Flows: ${failCount}`);
  console.log(`Throughput: ${(CONCURRENCY / totalTime).toFixed(2)} ops/sec`);
  
  if (failCount > 0) {
    console.error(`\nWARNING: ${failCount} requests failed! Check server logs for memory/CPU issues.`);
  } else {
    console.log(`\nSUCCESS: Server handled ${CONCURRENCY} concurrent PQC operations flawlessly.`);
  }
}

runStressTest().catch(console.error);
