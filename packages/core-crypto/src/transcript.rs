//! Transcript hashing & channel binding for NEN-PROTOCOL-V3 (T3).
//!
//! V1/V2 optionally signed only the ephemeral ML-KEM public key, which gives no
//! server authentication and no channel binding. V3 makes the signed message a
//! full transcript:
//!
//! ```text
//! transcript = SHA-256( client_pk_kem || client_pk_x || server_nonce || sid )
//! ```
//!
//! The session id is bound to this hash (channel binding), so a stolen `sid`
//! cannot be replayed against a different transcript, and an opt-in server
//! identity key (ML-DSA) signs the transcript so the client can authenticate the
//! server without trusting the web PKI.
//!
//! Length-prefixing each field prevents canonicalization ambiguity (e.g. a moved
//! byte boundary producing the same concatenation).

use wasm_bindgen::prelude::*;
use sha2::{Sha256, Digest};

fn put_field(h: &mut Sha256, field: &[u8]) {
    h.update((field.len() as u32).to_be_bytes());
    h.update(field);
}

/// Compute the V3 transcript hash over the handshake inputs.
/// `pk_x` may be empty in `pqc-only` mode; `sid` is the UTF-8 session id bytes.
#[wasm_bindgen]
pub fn nen_transcript_hash(
    client_pk_kem: &[u8],
    client_pk_x: &[u8],
    server_nonce: &[u8],
    sid: &[u8],
) -> Vec<u8> {
    let mut h = Sha256::new();
    put_field(&mut h, client_pk_kem);
    put_field(&mut h, client_pk_x);
    put_field(&mut h, server_nonce);
    put_field(&mut h, sid);
    h.finalize().to_vec()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn transcript_is_deterministic() {
        let a = nen_transcript_hash(b"pk", b"px", b"nonce", b"sid");
        let b = nen_transcript_hash(b"pk", b"px", b"nonce", b"sid");
        assert_eq!(a, b);
        assert_eq!(a.len(), 32);
    }

    /// Substituting the server nonce or any public key changes the transcript
    /// (this is what makes a swapped nonce/pk surface as ISO-3007).
    #[test]
    fn transcript_binds_every_field() {
        let base = nen_transcript_hash(b"pk", b"px", b"nonce", b"sid");
        assert_ne!(base, nen_transcript_hash(b"PK", b"px", b"nonce", b"sid"));
        assert_ne!(base, nen_transcript_hash(b"pk", b"PX", b"nonce", b"sid"));
        assert_ne!(base, nen_transcript_hash(b"pk", b"px", b"NONCE", b"sid"));
        assert_ne!(base, nen_transcript_hash(b"pk", b"px", b"nonce", b"SID"));
    }

    /// Length-prefixing prevents field-boundary ambiguity: ('ab','c') must not
    /// collide with ('a','bc').
    #[test]
    fn transcript_is_unambiguous() {
        let x = nen_transcript_hash(b"ab", b"c", b"", b"");
        let y = nen_transcript_hash(b"a", b"bc", b"", b"");
        assert_ne!(x, y);
    }
}
