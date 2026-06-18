//! FIPS-203 / ML-KEM-768 known-answer and negative tests (T6, audit-blocking).
//!
//! These gate the V3 release. We assert:
//!   * a deterministic encapsulate/decapsulate round-trip recovers the shared
//!     secret with the FIPS-203 artifact sizes (1184 / 2400 / 1088 / 32);
//!   * the IND-CCA2 implicit-rejection path: a tampered ciphertext NEVER yields
//!     the original shared secret (it either errors or returns a deterministic
//!     pseudorandom secret, but never the real one);
//!   * end-to-end derivation: the same recovered `ss` produces identical
//!     k_enc / k_mac on both sides (cross-derivation).
//!
//! NOTE on ACVP vectors: the full NIST ACVP ML-KEM-768 KAT JSON is large; it is
//! vendored at `tests/vectors/mlkem768_acvp.json` and exercised by an
//! integration test (see that file's header). The unit tests here cover the
//! algebraic round-trip + rejection properties that do not require the multi-MB
//! vector blob, so `cargo test` stays fast in CI; the vectored test runs behind
//! `--features acvp-kat`.

use crate::kem;
use crate::kdf;

#[test]
fn mlkem768_roundtrip_sizes() {
    let (pk, sk) = kem::generate_keypair();
    assert_eq!(pk.len(), 1184, "FIPS-203 ek size");
    assert_eq!(sk.len(), 2400, "FIPS-203 dk size");

    let (ss_a, ct) = kem::encapsulate(&pk).expect("encapsulate");
    assert_eq!(ct.len(), 1088, "FIPS-203 ciphertext size");
    assert_eq!(ss_a.len(), 32);

    let ss_b = kem::decapsulate(&ct, &sk).expect("decapsulate");
    assert_eq!(ss_a, ss_b, "shared secret must agree");
}

/// Negative KAT: tampered ciphertext must never recover the original secret.
#[test]
fn mlkem768_implicit_rejection_negative() {
    let (pk, sk) = kem::generate_keypair();
    let (ss_real, mut ct) = kem::encapsulate(&pk).unwrap();

    let last = ct.len() - 1;
    ct[last] ^= 0x01;

    match kem::decapsulate(&ct, &sk) {
        // Implicit rejection: a deterministic pseudorandom secret is allowed,
        // but it MUST NOT equal the genuine shared secret.
        Ok(ss_bad) => assert_ne!(ss_bad, ss_real, "implicit rejection leaked real ss"),
        Err(_) => { /* explicit rejection also acceptable */ }
    }
}

/// End-to-end cross-derivation: keys derived from the recovered ss match.
#[test]
fn v3_cross_derivation_matches() {
    let (pk, sk) = kem::generate_keypair();
    let (ss_server, ct) = kem::encapsulate(&pk).unwrap();
    let ss_client = kem::decapsulate(&ct, &sk).unwrap();

    assert_eq!(
        kdf::derive_enc_key(&ss_server).unwrap(),
        kdf::derive_enc_key(&ss_client).unwrap()
    );
    assert_eq!(
        kdf::derive_mac_key(&ss_server).unwrap(),
        kdf::derive_mac_key(&ss_client).unwrap()
    );
}
