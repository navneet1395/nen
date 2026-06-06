use wasm_bindgen::prelude::*;
use base64::{Engine as _, engine::general_purpose::STANDARD};

#[wasm_bindgen]
pub fn isogeny_to_base64(bytes: &[u8]) -> String {
    STANDARD.encode(bytes)
}

#[wasm_bindgen]
pub fn isogeny_from_base64(encoded: &str) -> Result<Vec<u8>, JsValue> {
    STANDARD.decode(encoded).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_base64_roundtrip() {
        let original = vec![0, 1, 2, 255, 128, 64];
        let encoded = isogeny_to_base64(&original);
        let decoded = isogeny_from_base64(&encoded).unwrap();
        assert_eq!(original, decoded);
    }
}
