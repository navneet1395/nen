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
}
