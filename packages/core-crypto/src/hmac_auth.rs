use wasm_bindgen::prelude::*;
use hmac::{Hmac, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

#[wasm_bindgen]
pub fn nen_hmac_sign(key: &[u8], message: &[u8]) -> Result<Vec<u8>, JsValue> {
    let mut mac = HmacSha256::new_from_slice(key)
        .map_err(|e| JsValue::from_str(&format!("Invalid HMAC key length: {}", e)))?;
    mac.update(message);
    Ok(mac.finalize().into_bytes().to_vec())
}

#[wasm_bindgen]
pub fn nen_hmac_verify(key: &[u8], message: &[u8], signature: &[u8]) -> bool {
    if let Ok(mut mac) = HmacSha256::new_from_slice(key) {
        mac.update(message);
        mac.verify_slice(signature).is_ok()
    } else {
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hmac_sign_verify() {
        let key = b"my-secret-key-that-is-secure";
        let message = b"hello world";
        let signature = nen_hmac_sign(key, message).unwrap();
        
        assert!(nen_hmac_verify(key, message, &signature));
        assert!(!nen_hmac_verify(key, b"hello worle", &signature));
    }

    fn hex(s: &str) -> Vec<u8> {
        (0..s.len())
            .step_by(2)
            .map(|i| u8::from_str_radix(&s[i..i + 2], 16).unwrap())
            .collect()
    }

    /// RFC 4231 Test Case 2 (HMAC-SHA256): key = "Jefe",
    /// data = "what do ya want for nothing?".
    #[test]
    fn rfc4231_case2_hmac_sha256() {
        let key = b"Jefe";
        let data = b"what do ya want for nothing?";
        let expected = hex("5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843");
        let mac = nen_hmac_sign(key, data).unwrap();
        assert_eq!(mac, expected);
        assert!(nen_hmac_verify(key, data, &expected));
    }

    /// Constant-time verification: `verify_slice` from the `hmac` crate uses a
    /// constant-time tag comparison (never `==`). A tag that differs only in its
    /// LAST byte must still be rejected — a non-constant-time `==` that
    /// short-circuits on the first differing byte would also reject it, so this
    /// is an availability/contract assertion that we route through the CT path.
    #[test]
    fn verify_is_constant_time_compare() {
        let key = b"ct-key";
        let msg = b"abc";
        let mut good = nen_hmac_sign(key, msg).unwrap();
        // Flip only the final byte.
        let last = good.len() - 1;
        good[last] ^= 0x01;
        assert!(!nen_hmac_verify(key, msg, &good));
        // A wrong-length tag must also be rejected, not panic.
        assert!(!nen_hmac_verify(key, msg, &[0u8; 8]));
    }
}
