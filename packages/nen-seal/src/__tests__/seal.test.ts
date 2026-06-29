import {
  seal,
  open,
  sealString,
  openString,
  sealJSON,
  openJSON,
  sealSigned,
  openSigned,
  sealFramed,
  openFramed,
  generateSealKeypair,
  generateSigningKeypair,
  SEAL_VERSION,
  NenSignedEnvelope,
} from '../index';

describe('@withnen/seal — envelope seal/open', () => {
  test('round-trips bytes to the recipient', () => {
    const kp = generateSealKeypair();
    const data = new TextEncoder().encode('classified payload');
    const env = seal(kp.publicKey, data);

    expect(env.v).toBe(SEAL_VERSION);
    expect(typeof env.kem).toBe('string');
    expect(new TextDecoder().decode(open(kp.secretKey, env))).toBe('classified payload');
  });

  test('envelope leaks no plaintext or key material', () => {
    const kp = generateSealKeypair();
    const env = seal(kp.publicKey, new TextEncoder().encode('secret-marker-123'));
    const blob = JSON.stringify(env);
    expect(blob).not.toContain('secret-marker-123');
    // Only the four expected fields.
    expect(Object.keys(env).sort()).toEqual(['ct', 'kem', 'n', 'v']);
  });

  test('a different keypair cannot open the envelope', () => {
    const alice = generateSealKeypair();
    const bob = generateSealKeypair();
    const env = seal(alice.publicKey, new TextEncoder().encode('for alice only'));
    expect(() => open(bob.secretKey, env)).toThrow();
  });

  test('tampered ciphertext is rejected by the AEAD tag', () => {
    const kp = generateSealKeypair();
    const env = seal(kp.publicKey, new TextEncoder().encode('x'));
    const bad = { ...env, ct: (env.ct[0] === 'A' ? 'B' : 'A') + env.ct.slice(1) };
    expect(() => open(kp.secretKey, bad)).toThrow();
  });

  test('unsupported version throws', () => {
    const kp = generateSealKeypair();
    const env = seal(kp.publicKey, new TextEncoder().encode('x'));
    expect(() => open(kp.secretKey, { ...env, v: 99 })).toThrow(/version/);
  });
});

describe('context binding (domain separation)', () => {
  test('an envelope sealed under one context cannot be opened as another', () => {
    const kp = generateSealKeypair();
    const env = seal(kp.publicKey, new TextEncoder().encode('p'), { context: 'webhook:order.created' });
    expect(env.ctx).toBe('webhook:order.created');

    // Same envelope opens correctly with the embedded context.
    expect(new TextDecoder().decode(open(kp.secretKey, env))).toBe('p');

    // Forcing a different context breaks the derivation → AEAD fails.
    expect(() => open(kp.secretKey, { ...env, ctx: 'webhook:order.deleted' })).toThrow();
  });
});

describe('string / JSON helpers', () => {
  test('sealString/openString', () => {
    const kp = generateSealKeypair();
    const env = sealString(kp.publicKey, 'hello world');
    expect(openString(kp.secretKey, env)).toBe('hello world');
  });

  test('sealJSON/openJSON preserves structure', () => {
    const kp = generateSealKeypair();
    const value = { ssn: '111-22-3333', amounts: [1, 2, 3], nested: { ok: true } };
    const env = sealJSON(kp.publicKey, value);
    expect(openJSON<typeof value>(kp.secretKey, env)).toEqual(value);
  });
});

describe('signed envelopes (sender authenticity)', () => {
  test('openSigned verifies a valid signature and pins the sender', () => {
    const recipient = generateSealKeypair();
    const signer = generateSigningKeypair();
    const env = sealSigned(recipient.publicKey, new TextEncoder().encode('webhook body'), signer, {
      context: 'webhook:payment.succeeded',
    });

    const out = openSigned(recipient.secretKey, env, signer.publicKey);
    expect(new TextDecoder().decode(out)).toBe('webhook body');
  });

  test('a forged/altered envelope fails signature verification', () => {
    const recipient = generateSealKeypair();
    const signer = generateSigningKeypair();
    const env = sealSigned(recipient.publicKey, new TextEncoder().encode('body'), signer);

    // Swap the ciphertext for a freshly sealed one — signature no longer matches.
    const other = seal(recipient.publicKey, new TextEncoder().encode('evil'));
    const tampered: NenSignedEnvelope = { ...env, ct: other.ct, n: other.n, kem: other.kem };
    expect(() => openSigned(recipient.secretKey, tampered)).toThrow(/signature/);
  });

  test('an unexpected signer is rejected even if its signature is valid', () => {
    const recipient = generateSealKeypair();
    const attacker = generateSigningKeypair();
    const expected = generateSigningKeypair();
    const env = sealSigned(recipient.publicKey, new TextEncoder().encode('body'), attacker);
    expect(() => openSigned(recipient.secretKey, env, expected.publicKey)).toThrow(/signer key/);
  });
});

describe('framed envelopes (large payloads / media)', () => {
  test('round-trips a multi-frame payload', () => {
    const kp = generateSealKeypair();
    const data = new Uint8Array(700 * 1024);
    for (let i = 0; i < data.length; i++) data[i] = (i * 31) & 0xff;

    const env = sealFramed(kp.publicKey, data, { frameSize: 256 * 1024, context: 'media:image' });
    expect(env.frames.length).toBe(3); // 256K + 256K + ~188K
    expect(env.size).toBe(data.length);

    const back = openFramed(kp.secretKey, env);
    expect(back.length).toBe(data.length);
    expect(Array.from(back.subarray(0, 5))).toEqual(Array.from(data.subarray(0, 5)));
    expect(Buffer.from(back).equals(Buffer.from(data))).toBe(true);
  });

  test('handles empty and sub-frame payloads', () => {
    const kp = generateSealKeypair();
    for (const len of [0, 10, 256 * 1024]) {
      const data = new Uint8Array(len).fill(7);
      const env = sealFramed(kp.publicKey, data);
      expect(Buffer.from(openFramed(kp.secretKey, env)).equals(Buffer.from(data))).toBe(true);
    }
  });

  test('a dropped frame is detected (length mismatch)', () => {
    const kp = generateSealKeypair();
    const data = new Uint8Array(600 * 1024).fill(3);
    const env = sealFramed(kp.publicKey, data, { frameSize: 256 * 1024 });
    env.frames.pop(); // truncate the stream
    expect(() => openFramed(kp.secretKey, env)).toThrow(/length mismatch/);
  });
});
