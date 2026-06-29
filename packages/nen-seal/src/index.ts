/**
 * @withnen/seal — session-less, public-key envelope encryption.
 *
 * Everything in the Nen "second wave" (encrypted webhooks, browser-sealed form
 * fields & uploads, field-level encryption, media content-key wrapping) reduces
 * to the same primitive: encrypt a payload to a recipient's ML-KEM public key,
 * with no shared session and nothing secret on the wire.
 *
 * Mechanics (matches PROTOCOL.md's "never use the KEM shared secret directly"):
 *   seal(pk, data):
 *     (kem_ct, ss) = ML-KEM-768.encapsulate(pk)
 *     cek          = HKDF(ss, "nen/seal v1 cek"[|context], 32)
 *     ct           = ChaCha20-Poly1305(cek, nonce, data)
 *     envelope     = { v, kem: kem_ct, n: nonce, ct[, ctx] }   // base64
 *   open(sk, env):
 *     ss  = ML-KEM-768.decapsulate(env.kem, sk)
 *     cek = HKDF(ss, "nen/seal v1 cek"[|env.ctx], 32)
 *     data = ChaCha20-Poly1305.open(cek, env.n, env.ct)
 *
 * `context` is bound into the key derivation (domain separation): an envelope
 * sealed for context "webhook:order.created" cannot be opened as any other
 * context, even with the same recipient key.
 */
import * as nen from '@withnen/core-crypto';

// Application layers built on the envelope primitive.
export * from './fields';
export * from './webhook';
export * from './media';

/** Envelope wire version. Bump only on a breaking format change. */
export const SEAL_VERSION = 1;

const CEK_INFO = 'nen/seal v1 cek';
const FRAME_KEY_INFO = 'nen/seal v1 frame';

/** A raw Nen keypair (ML-KEM for seal/open, or ML-DSA for signing). */
export interface NenKeypair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

/** A sealed, base64-only envelope. Safe to store or transmit in the clear. */
export interface NenEnvelope {
  /** Envelope format version. */
  v: number;
  /** base64 ML-KEM-768 ciphertext (the encapsulated key). */
  kem: string;
  /** base64 ChaCha20-Poly1305 nonce. */
  n: string;
  /** base64 ChaCha20-Poly1305 ciphertext + tag. */
  ct: string;
  /** Optional context label, bound into key derivation. */
  ctx?: string;
}

/** A {@link NenEnvelope} additionally signed by the sender (ML-DSA-65). */
export interface NenSignedEnvelope extends NenEnvelope {
  /** base64 ML-DSA signature over the canonical envelope bytes. */
  sig: string;
  /** base64 ML-DSA public key of the signer. */
  spk: string;
}

export interface SealOptions {
  /**
   * Domain-separation label bound into the content-key derivation. The same
   * label must be used to open. Use it to scope an envelope to a purpose,
   * e.g. `"webhook:order.created"` or `"upload:passport"`.
   */
  context?: string;
}

/** Generate an ML-KEM-768 keypair for {@link seal} / {@link open}. */
export function generateSealKeypair(): NenKeypair {
  const kp = nen.nen_generate_keypair();
  return { publicKey: kp.public_key, secretKey: kp.secret_key };
}

/** Generate an ML-DSA-65 keypair for {@link sealSigned} / {@link openSigned}. */
export function generateSigningKeypair(): NenKeypair {
  const kp = nen.nen_generate_signing_keypair();
  return { publicKey: kp.public_key, secretKey: kp.secret_key };
}

function cekFor(ss: Uint8Array, context?: string): Uint8Array {
  const info = context ? `${CEK_INFO}|${context}` : CEK_INFO;
  return nen.nen_hkdf(ss, info, 32);
}

/** Encrypt `data` to `recipientPublicKey`. Returns a base64-only envelope. */
export function seal(
  recipientPublicKey: Uint8Array,
  data: Uint8Array,
  opts: SealOptions = {}
): NenEnvelope {
  const enc = nen.nen_encapsulate(recipientPublicKey);
  const cek = cekFor(enc.shared_secret, opts.context);
  const nonce = nen.nen_generate_nonce();
  const ct = nen.nen_encrypt(cek, nonce, data);
  const env: NenEnvelope = {
    v: SEAL_VERSION,
    kem: nen.nen_to_base64(enc.ciphertext),
    n: nen.nen_to_base64(nonce),
    ct: nen.nen_to_base64(ct),
  };
  if (opts.context) env.ctx = opts.context;
  return env;
}

/** Decrypt an envelope with the recipient's secret key. */
export function open(secretKey: Uint8Array, env: NenEnvelope): Uint8Array {
  if (env.v !== SEAL_VERSION) {
    throw new Error(`nen/seal: unsupported envelope version ${env.v}`);
  }
  const ss = nen.nen_decapsulate(nen.nen_from_base64(env.kem), secretKey);
  const cek = cekFor(ss, env.ctx);
  return nen.nen_decrypt(cek, nen.nen_from_base64(env.n), nen.nen_from_base64(env.ct));
}

/* ------------------------------------------------------------------ *
 * String / JSON convenience
 * ------------------------------------------------------------------ */

const enc = new TextEncoder();
const dec = new TextDecoder();

export function sealString(pk: Uint8Array, text: string, opts?: SealOptions): NenEnvelope {
  return seal(pk, enc.encode(text), opts);
}

export function openString(sk: Uint8Array, env: NenEnvelope): string {
  return dec.decode(open(sk, env));
}

export function sealJSON(pk: Uint8Array, value: unknown, opts?: SealOptions): NenEnvelope {
  return sealString(pk, JSON.stringify(value), opts);
}

export function openJSON<T = unknown>(sk: Uint8Array, env: NenEnvelope): T {
  return JSON.parse(openString(sk, env)) as T;
}

/* ------------------------------------------------------------------ *
 * Signed envelopes (sender authenticity — used by webhooks)
 * ------------------------------------------------------------------ */

function canonicalBytes(env: NenEnvelope): Uint8Array {
  // Stable byte string over every field that must not be tampered with.
  return enc.encode(`${env.v}\n${env.kem}\n${env.n}\n${env.ct}\n${env.ctx ?? ''}`);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Seal `data` to a recipient AND sign the envelope with an ML-DSA key. */
export function sealSigned(
  recipientPublicKey: Uint8Array,
  data: Uint8Array,
  signer: NenKeypair,
  opts?: SealOptions
): NenSignedEnvelope {
  const env = seal(recipientPublicKey, data, opts);
  const sig = nen.nen_sign(signer.secretKey, canonicalBytes(env));
  return { ...env, sig: nen.nen_to_base64(sig), spk: nen.nen_to_base64(signer.publicKey) };
}

/**
 * Verify the signature, then open. If `expectedSignerPublicKey` is given, the
 * envelope's signer key must match it (pin the sender) — otherwise any valid
 * self-signed envelope would pass.
 */
export function openSigned(
  secretKey: Uint8Array,
  env: NenSignedEnvelope,
  expectedSignerPublicKey?: Uint8Array
): Uint8Array {
  const spk = nen.nen_from_base64(env.spk);
  if (expectedSignerPublicKey && !timingSafeEqual(spk, expectedSignerPublicKey)) {
    throw new Error('nen/seal: signer key does not match the expected sender');
  }
  const ok = nen.nen_verify_signature(spk, canonicalBytes(env), nen.nen_from_base64(env.sig));
  if (!ok) throw new Error('nen/seal: signature verification failed');
  return open(secretKey, env);
}

/* ------------------------------------------------------------------ *
 * Framed envelopes (large blobs / media — one KEM op, many AEAD frames)
 * ------------------------------------------------------------------ */

/** Default media frame size (bytes). */
export const DEFAULT_FRAME_SIZE = 256 * 1024;

/** A large payload sealed as independent AEAD frames under one envelope. */
export interface NenFramedEnvelope {
  v: number;
  /** base64 ML-KEM-768 ciphertext. */
  kem: string;
  ctx?: string;
  /** Plaintext bytes per frame (the last frame may be shorter). */
  frameSize: number;
  /** Total plaintext length, so truncation/extension is detectable. */
  size: number;
  /** base64 AEAD ciphertext per frame, in order. */
  frames: string[];
}

// Each frame gets its own HKDF-derived key (so a fixed zero nonce is safe and
// the frame index is authenticated by being part of the key derivation).
function frameKey(cek: Uint8Array, index: number): Uint8Array {
  return nen.nen_hkdf(cek, `${FRAME_KEY_INFO}:${index}`, 32);
}
const ZERO_NONCE = new Uint8Array(12);

export interface FramedSealOptions extends SealOptions {
  frameSize?: number;
}

/** Seal a large payload to a recipient as a sequence of AEAD frames. */
export function sealFramed(
  recipientPublicKey: Uint8Array,
  data: Uint8Array,
  opts: FramedSealOptions = {}
): NenFramedEnvelope {
  const frameSize = opts.frameSize ?? DEFAULT_FRAME_SIZE;
  const encap = nen.nen_encapsulate(recipientPublicKey);
  const cek = cekFor(encap.shared_secret, opts.context);

  const frames: string[] = [];
  for (let off = 0, i = 0; off < data.length || (off === 0 && data.length === 0); off += frameSize, i++) {
    const chunk = data.subarray(off, Math.min(off + frameSize, data.length));
    frames.push(nen.nen_to_base64(nen.nen_encrypt(frameKey(cek, i), ZERO_NONCE, chunk)));
    if (data.length === 0) break;
  }

  const out: NenFramedEnvelope = {
    v: SEAL_VERSION,
    kem: nen.nen_to_base64(encap.ciphertext),
    frameSize,
    size: data.length,
    frames,
  };
  if (opts.context) out.ctx = opts.context;
  return out;
}

/** Open a framed envelope back into the original bytes. */
export function openFramed(secretKey: Uint8Array, env: NenFramedEnvelope): Uint8Array {
  if (env.v !== SEAL_VERSION) {
    throw new Error(`nen/seal: unsupported envelope version ${env.v}`);
  }
  const ss = nen.nen_decapsulate(nen.nen_from_base64(env.kem), secretKey);
  const cek = cekFor(ss, env.ctx);

  const out = new Uint8Array(env.size);
  let off = 0;
  for (let i = 0; i < env.frames.length; i++) {
    const plain = nen.nen_decrypt(frameKey(cek, i), ZERO_NONCE, nen.nen_from_base64(env.frames[i]));
    out.set(plain, off);
    off += plain.length;
  }
  if (off !== env.size) {
    throw new Error(`nen/seal: framed payload length mismatch (got ${off}, expected ${env.size})`);
  }
  return out;
}
