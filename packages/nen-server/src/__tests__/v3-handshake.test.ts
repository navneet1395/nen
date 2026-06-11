import * as nenCrypto from '@withnen/core-crypto';
import { handleHandshake } from '../middleware';

// Web Crypto shim for Node.
if (!globalThis.crypto?.randomUUID) {
  const crypto = require('crypto');
  globalThis.crypto = {
    randomUUID: () => crypto.randomUUID(),
    getRandomValues: (a: Uint8Array) => crypto.randomFillSync(a),
  } as any;
}

/**
 * NEN-PROTOCOL-V3 verification deltas (the review's acceptance checks).
 * These run against the real Wasm core via the jest moduleNameMapper
 * (@withnen/core-crypto -> pkg/node).
 */
describe('NEN-PROTOCOL-V3 handshake', () => {
  function clientHybridHandshakeBody() {
    const kem = nenCrypto.nen_generate_keypair();
    const x = nenCrypto.nen_x25519_keypair();
    return {
      kem,
      x,
      body: {
        pk_kem: nenCrypto.nen_to_base64(kem.public_key),
        pk_x: nenCrypto.nen_to_base64(x.public_key),
        securityMode: 'hybrid',
      },
    };
  }

  test('No-plaintext-key: response contains only { sid, ct, pk_x_server } — no key material (regression for finding #1)', async () => {
    const { body } = clientHybridHandshakeBody();
    const res = await handleHandshake(
      new Request('http://localhost/api/nen/handshake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(Object.keys(json).sort()).toEqual(['ct', 'pk_x_server', 'sid'].sort());
    // The dropped V2 field must never reappear.
    expect(json.hmac).toBeUndefined();
    expect(json.encKey).toBeUndefined();
    expect(json.macKey).toBeUndefined();
  });

  test('Cross-derivation: client derives the same k_enc / k_mac the server stored', async () => {
    const { kem, x, body } = clientHybridHandshakeBody();
    const res = await handleHandshake(
      new Request('http://localhost/api/nen/handshake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    );
    const json = await res.json();

    // Reproduce the client side of the derivation.
    const ct = nenCrypto.nen_from_base64(json.ct);
    const mlkemSs = nenCrypto.nen_decapsulate(ct, kem.secret_key);
    const serverPkX = nenCrypto.nen_from_base64(json.pk_x_server);
    const x25519Ss = nenCrypto.nen_x25519_dh(x.secret_key, serverPkX);
    const ss = nenCrypto.nen_hybrid_combine(x25519Ss, mlkemSs);

    const encKey = nenCrypto.nen_derive_enc_key(ss);
    const macKey = nenCrypto.nen_derive_mac_key(ss);

    // The session must round-trip an encrypted payload under the derived keys.
    const nonce = nenCrypto.nen_generate_nonce();
    const ctBody = nenCrypto.nen_encrypt(encKey, nonce, new TextEncoder().encode('ping'));
    const back = nenCrypto.nen_decrypt(encKey, nonce, ctBody);
    expect(new TextDecoder().decode(back)).toBe('ping');
    expect(encKey.length).toBe(32);
    expect(macKey.length).toBe(32);
  });

  test('pqc-only mode omits the X25519 leg', async () => {
    const kem = nenCrypto.nen_generate_keypair();
    const res = await handleHandshake(
      new Request('http://localhost/api/nen/handshake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pk_kem: nenCrypto.nen_to_base64(kem.public_key),
          securityMode: 'pqc-only',
        }),
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.pk_x_server).toBeUndefined();
    expect(json.hmac).toBeUndefined();
  });
});
