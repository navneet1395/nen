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

export function nen_decapsulate(ciphertext: Uint8Array, secret_key: Uint8Array): Uint8Array;

export function nen_decrypt(key: Uint8Array, nonce: Uint8Array, ciphertext: Uint8Array): Uint8Array;

export function nen_encapsulate(public_key: Uint8Array): NenEncapsulation;

export function nen_encrypt(key: Uint8Array, nonce: Uint8Array, plaintext: Uint8Array): Uint8Array;

export function nen_from_base64(encoded: string): Uint8Array;

export function nen_generate_keypair(): NenKeypair;

export function nen_generate_nonce(): Uint8Array;

export function nen_generate_signing_keypair(): NenSigningKeypair;

export function nen_hmac_sign(key: Uint8Array, message: Uint8Array): Uint8Array;

export function nen_hmac_verify(key: Uint8Array, message: Uint8Array, signature: Uint8Array): boolean;

export function nen_sign(secret_key: Uint8Array, message: Uint8Array): Uint8Array;

export function nen_to_base64(bytes: Uint8Array): string;

export function nen_verify_signature(public_key: Uint8Array, message: Uint8Array, signature_bytes: Uint8Array): boolean;
