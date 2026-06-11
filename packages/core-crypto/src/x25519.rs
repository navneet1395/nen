//! X25519 classical key agreement + hybrid combiner for NEN-PROTOCOL-V3 (T2).
//!
//! Defense-in-depth: the session stays secure if *either* X25519 or ML-KEM-768
//! is broken. We combine the two shared secrets per NIST SP 800-56C / the IETF
//! hybrid-KEM drafts (and the pattern TLS 1.3 hybrid, AWS, and Cloudflare ship):
//!
//!     ss = HKDF-SHA256( x25519_shared || mlkem_shared , info = "nen/v3 hybrid" )
//!
//! Concatenation order is fixed (classical first, then PQC) and MUST match on
//! both sides.

use wasm_bindgen::prelude::*;
use x25519_dalek::{StaticSecret, PublicKey};
use rand::rngs::OsRng;
use crate::kdf;

pub const X25519_KEY_LEN: usize = 32;

/// An X25519 keypair (raw 32-byte public + secret).
#[wasm_bindgen(getter_with_clone)]
pub struct NenX25519Keypair {
    pub public_key: Vec<u8>,
    pub secret_key: Vec<u8>,
}

/// Generate an ephemeral X25519 keypair.
#[wasm_bindgen]
pub fn nen_x25519_keypair() -> NenX25519Keypair {
    let secret = StaticSecret::random_from_rng(OsRng);
    let public = PublicKey::from(&secret);
    NenX25519Keypair {
        public_key: public.as_bytes().to_vec(),
        secret_key: secret.to_bytes().to_vec(),
    }
}

/// X25519 Diffie-Hellman: combine our secret with the peer's public key to get
/// the 32-byte classical shared secret.
#[wasm_bindgen]
pub fn nen_x25519_dh(secret_key: &[u8], peer_public: &[u8]) -> Result<Vec<u8>, JsValue> {
    if secret_key.len() != X25519_KEY_LEN {
        return Err(JsValue::from_str("Invalid X25519 secret key length"));
    }
    if peer_public.len() != X25519_KEY_LEN {
        return Err(JsValue::from_str("Invalid X25519 public key length"));
    }
    let mut sk = [0u8; X25519_KEY_LEN];
    sk.copy_from_slice(secret_key);
    let mut pk = [0u8; X25519_KEY_LEN];
    pk.copy_from_slice(peer_public);

    let secret = StaticSecret::from(sk);
    let public = PublicKey::from(pk);
    let shared = secret.diffie_hellman(&public);
    Ok(shared.as_bytes().to_vec())
}

/// Combine the classical and post-quantum shared secrets into the V3 session
/// secret: HKDF-SHA256(x25519_ss || mlkem_ss, "nen/v3 hybrid"). 32-byte output.
#[wasm_bindgen]
pub fn nen_hybrid_combine(x25519_ss: &[u8], mlkem_ss: &[u8]) -> Result<Vec<u8>, JsValue> {
    let mut ikm = Vec::with_capacity(x25519_ss.len() + mlkem_ss.len());
    ikm.extend_from_slice(x25519_ss);
    ikm.extend_from_slice(mlkem_ss);
    kdf::hkdf(&ikm, kdf::INFO_HYBRID, 32).map_err(JsValue::from_str)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn x25519_dh_agrees() {
        let a = nen_x25519_keypair();
        let b = nen_x25519_keypair();
        let ab = nen_x25519_dh(&a.secret_key, &b.public_key).unwrap();
        let ba = nen_x25519_dh(&b.secret_key, &a.public_key).unwrap();
        assert_eq!(ab, ba, "both sides must derive the same X25519 secret");
        assert_eq!(ab.len(), 32);
    }

    #[test]
    fn hybrid_combine_is_order_sensitive_and_deterministic() {
        let x = [1u8; 32];
        let m = [2u8; 32];
        let combined = nen_hybrid_combine(&x, &m).unwrap();
        assert_eq!(combined.len(), 32);
        // Deterministic.
        assert_eq!(combined, nen_hybrid_combine(&x, &m).unwrap());
        // Swapping the inputs changes the result (order is part of the contract).
        assert_ne!(combined, nen_hybrid_combine(&m, &x).unwrap());
    }

    /// Hybrid security property: changing EITHER component changes the session
    /// secret, so an attacker must break BOTH to recover it.
    #[test]
    fn hybrid_depends_on_both_components() {
        let base = nen_hybrid_combine(&[9u8; 32], &[9u8; 32]).unwrap();
        let only_x_changed = nen_hybrid_combine(&[8u8; 32], &[9u8; 32]).unwrap();
        let only_m_changed = nen_hybrid_combine(&[9u8; 32], &[8u8; 32]).unwrap();
        assert_ne!(base, only_x_changed);
        assert_ne!(base, only_m_changed);
    }
}
