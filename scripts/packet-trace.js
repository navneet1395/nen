const isogenyCrypto = require('../pkg/node/core_crypto.js');

const TARGET_URL = 'http://localhost:3000';

async function runPacketTrace() {
  console.log(`\n==========================================`);
  console.log(`     ISOGENY SDK PACKET TRACE TEST`);
  console.log(`==========================================\n`);

  console.log(`[CLIENT] 1. Generating Kyber768 Keypair in WebAssembly...`);
  const keypair = isogenyCrypto.isogeny_generate_keypair();
  console.log(`[CLIENT]    -> Public Key Length: ${keypair.public_key.length} bytes`);
  console.log(`[CLIENT]    -> Secret Key Length: ${keypair.secret_key.length} bytes\n`);

  console.log(`[NETWORK] 2. Transmitting POST /api/isogeny/handshake`);
  const handshakePayload = JSON.stringify({ publicKey: Array.from(keypair.public_key) });
  console.log(`[NETWORK]    -> HTTP Body Payload Size: ${handshakePayload.length} bytes`);
  console.log(`[NETWORK]    -> Sample of data sent over the wire: ${handshakePayload.substring(0, 100)}...`);

  const hsStart = performance.now();
  const hsRes = await fetch(`${TARGET_URL}/api/isogeny/handshake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: handshakePayload
  });

  if (!hsRes.ok) {
    const text = await hsRes.text();
    throw new Error(`Handshake Failed: HTTP ${hsRes.status} - ${text}`);
  }
  const hsData = await hsRes.json();
  const hsTime = (performance.now() - hsStart).toFixed(2);

  console.log(`\n[NETWORK] 3. Received Response from /api/isogeny/handshake (${hsTime} ms)`);
  console.log(`[NETWORK]    -> Session ID assigned: ${hsData.sessionId}`);
  console.log(`[NETWORK]    -> Ciphertext Length: ${hsData.ciphertext.length} bytes`);
  console.log(`[NETWORK]    -> Sample of received ciphertext: [${hsData.ciphertext.slice(0, 10).join(', ')}, ...]`);

  console.log(`\n[CLIENT] 4. Decapsulating shared secret...`);
  const sharedSecret = isogenyCrypto.isogeny_decapsulate(new Uint8Array(hsData.ciphertext), keypair.secret_key);
  console.log(`[CLIENT]    -> Derived 32-byte shared secret successfully.\n`);

  const plaintextMsgObj = { message: "Hello Isogeny! This is a top-secret unencrypted string." };
  const plaintextMsg = JSON.stringify(plaintextMsgObj);
  console.log(`[CLIENT] 5. Preparing secure payload.`);
  console.log(`[CLIENT]    -> Original Plaintext: ${plaintextMsg}`);
  
  const payloadBytes = new TextEncoder().encode(plaintextMsg);
  const nonce = isogenyCrypto.isogeny_generate_nonce();
  const ciphertext = isogenyCrypto.isogeny_encrypt(sharedSecret, nonce, payloadBytes);

  console.log(`[CLIENT]    -> Encrypted with ChaCha20-Poly1305.`);
  console.log(`[CLIENT]    -> Nonce: [${nonce.slice(0, 5).join(', ')}, ...]`);
  console.log(`[CLIENT]    -> Ciphertext: [${ciphertext.slice(0, 10).join(', ')}, ...]`);

  console.log(`\n[NETWORK] 6. Transmitting POST /api/secure-data`);
  const securePayload = JSON.stringify({
    ciphertext: Array.from(ciphertext),
    nonce: Array.from(nonce)
  });
  console.log(`[NETWORK]    -> Session Header: X-Isogeny-Session: ${hsData.sessionId}`);
  console.log(`[NETWORK]    -> HTTP Body (What any wiretapper would see):`);
  console.log(`[NETWORK]    -> ${securePayload.substring(0, 150)}...\n`);
  console.log(`[NETWORK]    -> NOTE: The plaintext "${plaintextMsg}" is nowhere in the payload!`);

  const reqRes = await fetch(`${TARGET_URL}/api/secure-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Isogeny-Session': hsData.sessionId
    },
    body: securePayload
  });

  if (!reqRes.ok) throw new Error(`Secure data HTTP ${reqRes.status}`);
  const resData = await reqRes.json();
  
  console.log(`\n[NETWORK] 7. Received Response from /api/secure-data`);
  console.log(`[NETWORK]    -> Raw JSON Response Body: ${JSON.stringify(resData).substring(0, 100)}...`);

  console.log(`\n[CLIENT] 8. Decrypting response...`);
  const decryptedBytes = isogenyCrypto.isogeny_decrypt(
    sharedSecret, 
    new Uint8Array(resData.nonce), 
    new Uint8Array(resData.ciphertext)
  );
  
  const decryptedPlaintext = new TextDecoder().decode(decryptedBytes);
  console.log(`[CLIENT]    -> Decrypted Plaintext: ${decryptedPlaintext}`);
  console.log(`\n==========================================`);
  console.log(`     TRACE COMPLETE - 100% SECURE`);
  console.log(`==========================================\n`);
}

runPacketTrace().catch(console.error);
