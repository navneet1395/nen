/* tslint:disable */
/* eslint-disable */

export class NenEncapsulation {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    readonly ciphertext: Uint8Array;
    readonly shared_secret: Uint8Array;
}

export class NenKeypair {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    readonly public_key: Uint8Array;
    readonly secret_key: Uint8Array;
}

export class NenSigningKeypair {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    public_key: Uint8Array;
    secret_key: Uint8Array;
}

/**
 * An X25519 keypair (raw 32-byte public + secret).
 */
export class NenX25519Keypair {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    public_key: Uint8Array;
    secret_key: Uint8Array;
}

export function nen_decapsulate(ciphertext: Uint8Array, secret_key: Uint8Array): Uint8Array;

export function nen_decrypt(key: Uint8Array, nonce: Uint8Array, ciphertext: Uint8Array): Uint8Array;

/**
 * k_enc = HKDF-SHA256(ss, "nen/v3 enc") → 32-byte ChaCha20 key.
 */
export function nen_derive_enc_key(ss: Uint8Array): Uint8Array;

/**
 * k_mac = HKDF-SHA256(ss, "nen/v3 mac") → 32-byte HMAC key.
 */
export function nen_derive_mac_key(ss: Uint8Array): Uint8Array;

export function nen_encapsulate(public_key: Uint8Array): NenEncapsulation;

export function nen_encrypt(key: Uint8Array, nonce: Uint8Array, plaintext: Uint8Array): Uint8Array;

export function nen_from_base64(encoded: string): Uint8Array;

export function nen_generate_keypair(): NenKeypair;

export function nen_generate_nonce(): Uint8Array;

export function nen_generate_signing_keypair(): NenSigningKeypair;

/**
 * Generic HKDF-SHA256 expand. `info` is the domain-separation label.
 */
export function nen_hkdf(ss: Uint8Array, info: string, len: number): Uint8Array;

export function nen_hmac_sign(key: Uint8Array, message: Uint8Array): Uint8Array;

export function nen_hmac_verify(key: Uint8Array, message: Uint8Array, signature: Uint8Array): boolean;

/**
 * Combine the classical and post-quantum shared secrets into the V3 session
 * secret: HKDF-SHA256(x25519_ss || mlkem_ss, "nen/v3 hybrid"). 32-byte output.
 */
export function nen_hybrid_combine(x25519_ss: Uint8Array, mlkem_ss: Uint8Array): Uint8Array;

/**
 * One-way ratchet: k' = HKDF(k, "nen/v3 ratchet"). (Reserved for T5; exposed now
 * so the label is pinned alongside the rest of the schedule.)
 */
export function nen_ratchet_key(key: Uint8Array): Uint8Array;

export function nen_sign(secret_key: Uint8Array, message: Uint8Array): Uint8Array;

export function nen_to_base64(bytes: Uint8Array): string;

/**
 * Compute the V3 transcript hash over the handshake inputs.
 * `pk_x` may be empty in `pqc-only` mode; `sid` is the UTF-8 session id bytes.
 */
export function nen_transcript_hash(client_pk_kem: Uint8Array, client_pk_x: Uint8Array, server_nonce: Uint8Array, sid: Uint8Array): Uint8Array;

export function nen_verify_signature(public_key: Uint8Array, message: Uint8Array, signature_bytes: Uint8Array): boolean;

/**
 * X25519 Diffie-Hellman: combine our secret with the peer's public key to get
 * the 32-byte classical shared secret.
 */
export function nen_x25519_dh(secret_key: Uint8Array, peer_public: Uint8Array): Uint8Array;

/**
 * Generate an ephemeral X25519 keypair.
 */
export function nen_x25519_keypair(): NenX25519Keypair;
