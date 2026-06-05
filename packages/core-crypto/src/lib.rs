pub mod cipher;
pub mod kem;
pub mod utils;

use wasm_bindgen::prelude::*;

// -----------------------------------------------------------------------------
// Data Structures for Wasm interop
// -----------------------------------------------------------------------------

#[wasm_bindgen]
pub struct IsogenyKeypair {
    public_key: Vec<u8>,
    secret_key: Vec<u8>,
}

#[wasm_bindgen]
impl IsogenyKeypair {
    #[wasm_bindgen(getter)]
    pub fn public_key(&self) -> Vec<u8> {
        self.public_key.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn secret_key(&self) -> Vec<u8> {
        self.secret_key.clone()
    }
}

#[wasm_bindgen]
pub struct IsogenyEncapsulation {
    shared_secret: Vec<u8>,
    ciphertext: Vec<u8>,
}

#[wasm_bindgen]
impl IsogenyEncapsulation {
    #[wasm_bindgen(getter)]
    pub fn shared_secret(&self) -> Vec<u8> {
        self.shared_secret.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn ciphertext(&self) -> Vec<u8> {
        self.ciphertext.clone()
    }
}

// -----------------------------------------------------------------------------
// ML-KEM-768 APIs
// -----------------------------------------------------------------------------

#[wasm_bindgen]
pub fn isogeny_generate_keypair() -> IsogenyKeypair {
    let (public_key, secret_key) = kem::generate_keypair();
    IsogenyKeypair {
        public_key,
        secret_key,
    }
}

#[wasm_bindgen]
pub fn isogeny_encapsulate(public_key: &[u8]) -> Result<IsogenyEncapsulation, JsValue> {
    match kem::encapsulate(public_key) {
        Ok((shared_secret, ciphertext)) => Ok(IsogenyEncapsulation {
            shared_secret,
            ciphertext,
        }),
        Err(e) => Err(JsValue::from_str(e)),
    }
}

#[wasm_bindgen]
pub fn isogeny_decapsulate(ciphertext: &[u8], secret_key: &[u8]) -> Result<Vec<u8>, JsValue> {
    kem::decapsulate(ciphertext, secret_key).map_err(|e| JsValue::from_str(e))
}

// -----------------------------------------------------------------------------
// ChaCha20-Poly1305 APIs
// -----------------------------------------------------------------------------

#[wasm_bindgen]
pub fn isogeny_generate_nonce() -> Vec<u8> {
    cipher::generate_nonce()
}

#[wasm_bindgen]
pub fn isogeny_encrypt(key: &[u8], nonce: &[u8], plaintext: &[u8]) -> Result<Vec<u8>, JsValue> {
    cipher::encrypt(key, nonce, plaintext).map_err(|e| JsValue::from_str(e))
}

#[wasm_bindgen]
pub fn isogeny_decrypt(key: &[u8], nonce: &[u8], ciphertext: &[u8]) -> Result<Vec<u8>, JsValue> {
    cipher::decrypt(key, nonce, ciphertext).map_err(|e| JsValue::from_str(e))
}
