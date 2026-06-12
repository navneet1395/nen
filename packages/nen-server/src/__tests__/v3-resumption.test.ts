import * as nenCrypto from '@withnen/core-crypto';
import { handleHandshake, decryptBody, verifyRequest } from '../middleware';
import { getSession } from '../store';

if (!globalThis.crypto || !(globalThis.crypto as any).getRandomValues) {
  globalThis.crypto = require('crypto').webcrypto as any;
}

const HS = 'http://localhost/api/nen/handshake';

/** Replicate the client's hybrid handshake math to recover the combined ss + psk. */
function clientFullHandshake() {
  const kem = nenCrypto.nen_generate_keypair();
  const x = nenCrypto.nen_x25519_keypair();
  return {
    kem,
    x,
    body: { pk_kem: nenCrypto.nen_to_base64(kem.public_key), pk_x: nenCrypto.nen_to_base64(x.public_key), securityMode: 'hybrid' },
    deriveCombined(json: any) {
      const mlkemSs = nenCrypto.nen_decapsulate(nenCrypto.nen_from_base64(json.ct), kem.secret_key);
      const x25519Ss = nenCrypto.nen_x25519_dh(x.secret_key, nenCrypto.nen_from_base64(json.pk_x_server));
      return nenCrypto.nen_hybrid_combine(x25519Ss, mlkemSs);
    },
  };
}

function concat(...parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

describe('T4 — session resumption', () => {
  test('resume re-derives the same keys on both sides, no KEM, fresh per resume', async () => {
    // 1. Full handshake → ticket + psk (client-side).
    const c = clientFullHandshake();
    const full = await (await handleHandshake(new Request(HS, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c.body) }))).json();
    expect(full.ticket).toBeDefined();
    const combined = c.deriveCombined(full);
    const psk = nenCrypto.nen_hkdf(combined, 'nen/v3 resume', 32);

    // 2. Resume with the ticket + a fresh client nonce.
    const clientRn = crypto.getRandomValues(new Uint8Array(32));
    const res = await handleHandshake(new Request(HS, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume: full.ticket, rn: nenCrypto.nen_to_base64(clientRn) }),
    }));
    expect(res.status).toBe(200);
    const r = await res.json();
    expect(r.resumed).toBe(true);
    expect(r.ct).toBeUndefined(); // no KEM ciphertext — it was skipped
    expect(r.ticket).toBeDefined(); // fresh ticket issued

    // 3. Client derives the resumed keys from psk + both nonces and they MUST
    //    match what the server stored (cross-derivation).
    const serverRn = nenCrypto.nen_from_base64(r.srn);
    const ss2 = nenCrypto.nen_hkdf(concat(psk, clientRn, serverRn), 'nen/v3 resume-ss', 32);
    const encKey = nenCrypto.nen_derive_enc_key(ss2);
    const macKey = nenCrypto.nen_derive_mac_key(ss2);

    const stored = await getSession(r.sid);
    expect(Array.from(stored!.encKey)).toEqual(Array.from(encKey));
    expect(Array.from(stored!.macKey)).toEqual(Array.from(macKey));

    // 4. End-to-end: a request signed with the resumed macKey authenticates and
    //    the resumed encKey decrypts its body.
    const path = '/api/data';
    const nonce = nenCrypto.nen_generate_nonce();
    const n = nenCrypto.nen_to_base64(nonce);
    const ts = String(Date.now());
    const sig = nenCrypto.nen_to_base64(nenCrypto.nen_hmac_sign(macKey, new TextEncoder().encode(`POST\n${path}\n${ts}\n${n}`)));
    const session = await verifyRequest(r.sid, n, { method: 'POST', url: `http://localhost${path}`, timestamp: ts, signature: sig });
    const ct = nenCrypto.nen_to_base64(nenCrypto.nen_encrypt(encKey, nonce, new TextEncoder().encode('{"resumed":true}')));
    expect(new TextDecoder().decode(decryptBody(session, ct, n))).toBe('{"resumed":true}');

    // Two resumes from the same ticket yield DIFFERENT session keys (fresh nonces).
    const res2 = await (await handleHandshake(new Request(HS, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resume: full.ticket, rn: nenCrypto.nen_to_base64(crypto.getRandomValues(new Uint8Array(32))) }) }))).json();
    expect(res2.sid).not.toEqual(r.sid);
  });

  test('an invalid/tampered ticket is declined with 409 (client falls back to full handshake)', async () => {
    const res = await handleHandshake(new Request(HS, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume: 'not-a-real-ticket.deadbeef', rn: nenCrypto.nen_to_base64(crypto.getRandomValues(new Uint8Array(32))) }),
    }));
    expect(res.status).toBe(409);
    expect((await res.json()).resumed).toBe(false);
  });
});
