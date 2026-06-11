//! HKDF key schedule for NEN-PROTOCOL-V3.
//!
//! V1/V2 used the ML-KEM shared secret *directly* as the ChaCha20 key and shipped
//! a *separate random* HMAC key in the handshake response (plaintext, TLS-only).
//! That leaked the per-request auth key at every TLS-termination point Nen is
//! designed to defend (proxies, logs, APM, CDN).
//!
//! V3 stops transmitting any secret. Both keys are derived locally on each side
//! from the KEM shared secret via HKDF-SHA256 with domain-separated,
//! version-pinned `info` labels, so nothing secret crosses the wire and the two
//! keys are cryptographically independent.
//!
//! See ../../../KEY_SCHEDULE.md and PROTOCOL.md §3.

use wasm_bindgen::prelude::*;
use hkdf::Hkdf;
use sha2::Sha256;

/// Domain-separation labels. Version-pinned: a label change is a protocol break.
pub const INFO_ENC: &str = "nen/v3 enc";
pub const INFO_MAC: &str = "nen/v3 mac";
pub const INFO_HYBRID: &str = "nen/v3 hybrid";
pub const INFO_RESUME: &str = "nen/v3 resume";
pub const INFO_RATCHET: &str = "nen/v3 ratchet";

/// HKDF-SHA256 with an empty salt (the IKM is already a uniformly-random KEM
/// shared secret, so a salt adds nothing; domain separation comes from `info`).
/// Returns `len` bytes of output keying material.
pub fn hkdf(ikm: &[u8], info: &str, len: usize) -> Result<Vec<u8>, &'static str> {
    let hk = Hkdf::<Sha256>::new(None, ikm);
    let mut okm = vec![0u8; len];
    hk.expand(info.as_bytes(), &mut okm)
        .map_err(|_| "HKDF expand failed: invalid output length")?;
    Ok(okm)
}

/// Derive the 32-byte ChaCha20 encryption key from the shared secret.
pub fn derive_enc_key(ss: &[u8]) -> Result<Vec<u8>, &'static str> {
    hkdf(ss, INFO_ENC, 32)
}

/// Derive the 32-byte HMAC-SHA256 authentication key from the shared secret.
pub fn derive_mac_key(ss: &[u8]) -> Result<Vec<u8>, &'static str> {
    hkdf(ss, INFO_MAC, 32)
}

// -----------------------------------------------------------------------------
// Wasm exports
// -----------------------------------------------------------------------------

/// Generic HKDF-SHA256 expand. `info` is the domain-separation label.
#[wasm_bindgen]
pub fn nen_hkdf(ss: &[u8], info: &str, len: usize) -> Result<Vec<u8>, JsValue> {
    hkdf(ss, info, len).map_err(JsValue::from_str)
}

/// k_enc = HKDF-SHA256(ss, "nen/v3 enc") → 32-byte ChaCha20 key.
#[wasm_bindgen]
pub fn nen_derive_enc_key(ss: &[u8]) -> Result<Vec<u8>, JsValue> {
    derive_enc_key(ss).map_err(JsValue::from_str)
}

/// k_mac = HKDF-SHA256(ss, "nen/v3 mac") → 32-byte HMAC key.
#[wasm_bindgen]
pub fn nen_derive_mac_key(ss: &[u8]) -> Result<Vec<u8>, JsValue> {
    derive_mac_key(ss).map_err(JsValue::from_str)
}

/// One-way ratchet: k' = HKDF(k, "nen/v3 ratchet"). (Reserved for T5; exposed now
/// so the label is pinned alongside the rest of the schedule.)
#[wasm_bindgen]
pub fn nen_ratchet_key(key: &[u8]) -> Result<Vec<u8>, JsValue> {
    hkdf(key, INFO_RATCHET, 32).map_err(JsValue::from_str)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// RFC 5869 Test Case 1 (HKDF-SHA256).
    /// IKM = 0x0b*22, salt = 0x00..0x0c, info = 0xf0..0xf9, L = 42.
    /// We exercise the *expand* step against the published OKM by reconstructing
    /// the full extract+expand through the crate's `new` API with the RFC salt.
    #[test]
    fn rfc5869_case1_expand() {
        let ikm = hex("0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b");
        let salt = hex("000102030405060708090a0b0c");
        let info = hex("f0f1f2f3f4f5f6f7f8f9");
        let expected = hex(
            "3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865",
        );
        let hk = Hkdf::<Sha256>::new(Some(&salt), &ikm);
        let mut okm = vec![0u8; 42];
        hk.expand(&info, &mut okm).unwrap();
        assert_eq!(okm, expected);
    }

    /// Domain separation: enc and mac keys derived from the SAME ss must differ.
    #[test]
    fn enc_and_mac_are_independent() {
        let ss = [7u8; 32];
        let k_enc = derive_enc_key(&ss).unwrap();
        let k_mac = derive_mac_key(&ss).unwrap();
        assert_eq!(k_enc.len(), 32);
        assert_eq!(k_mac.len(), 32);
        assert_ne!(k_enc, k_mac, "enc/mac keys must be domain-separated");
    }

    /// Derivation is deterministic: same ss + label → same key (cross-derivation
    /// between client and server depends on this).
    #[test]
    fn derivation_is_deterministic() {
        let ss = [42u8; 32];
        assert_eq!(derive_enc_key(&ss).unwrap(), derive_enc_key(&ss).unwrap());
        assert_eq!(derive_mac_key(&ss).unwrap(), derive_mac_key(&ss).unwrap());
    }

    /// A label change must change the output (version-pinning guard).
    #[test]
    fn label_change_changes_output() {
        let ss = [1u8; 32];
        let a = hkdf(&ss, INFO_ENC, 32).unwrap();
        let b = hkdf(&ss, "nen/v4 enc", 32).unwrap();
        assert_ne!(a, b);
    }

    fn hex(s: &str) -> Vec<u8> {
        (0..s.len())
            .step_by(2)
            .map(|i| u8::from_str_radix(&s[i..i + 2], 16).unwrap())
            .collect()
    }
}
