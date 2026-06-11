#![no_main]
//! Wire-parser fuzz target (T6, audit-blocking).
//!
//! Feeds arbitrary bytes through the paths a hostile peer can reach:
//!   * base64 decode (every wire field arrives base64),
//!   * ChaCha20-Poly1305 decrypt (the `{ ct, n }` body),
//!   * ML-KEM decapsulate (the handshake ciphertext).
//! The contract is: NEVER panic and NEVER hang on attacker-controlled input —
//! malformed data must return a clean Err, not abort the process (DoS).
//!
//! Run:  cargo +nightly fuzz run wire_parser

use libfuzzer_sys::fuzz_target;
use core_crypto::{encoding, cipher, kem};

fuzz_target!(|data: &[u8]| {
    // 1. base64 decode of arbitrary text must not panic.
    if let Ok(s) = std::str::from_utf8(data) {
        let _ = encoding::nen_from_base64(s);
    }

    // 2. AEAD decrypt with a fixed key/nonce over hostile ciphertext.
    let key = [0u8; 32];
    let nonce = [0u8; 12];
    let _ = cipher::decrypt(&key, &nonce, data);

    // 3. ML-KEM decapsulate with a hostile ciphertext (length-checked internally).
    let (_pk, sk) = kem::generate_keypair();
    let _ = kem::decapsulate(data, &sk);
});
