use wasm_bindgen::prelude::*;
use ml_dsa::{MlDsa65, SigningKey, VerifyingKey, Signature, Generate};
use ml_dsa::pkcs8::{DecodePrivateKey, EncodePrivateKey, DecodePublicKey, EncodePublicKey};
use ml_dsa::signature::{Signer, Verifier, Keypair};

#[wasm_bindgen(getter_with_clone)]
pub struct IsogenySigningKeypair {
    pub public_key: Vec<u8>,
    pub secret_key: Vec<u8>,
}

#[wasm_bindgen]
pub fn isogeny_generate_signing_keypair() -> Result<IsogenySigningKeypair, JsValue> {
    let sk = SigningKey::<MlDsa65>::generate();
    let pk = sk.verifying_key();
    
    let pk_der = pk.to_public_key_der().map_err(|e| JsValue::from_str(&e.to_string()))?;
    let sk_der = sk.to_pkcs8_der().map_err(|e| JsValue::from_str(&e.to_string()))?;
    
    Ok(IsogenySigningKeypair {
        public_key: pk_der.as_bytes().to_vec(),
        secret_key: sk_der.as_bytes().to_vec(),
    })
}

#[wasm_bindgen]
pub fn isogeny_sign(secret_key: &[u8], message: &[u8]) -> Result<Vec<u8>, JsValue> {
    let sk = SigningKey::<MlDsa65>::from_pkcs8_der(secret_key)
        .map_err(|_| JsValue::from_str("Invalid secret key format"))?;
    
    let sig: Signature<MlDsa65> = sk.sign(message);
    Ok(sig.encode().to_vec())
}

#[wasm_bindgen]
pub fn isogeny_verify_signature(public_key: &[u8], message: &[u8], signature_bytes: &[u8]) -> bool {
    let pk = match VerifyingKey::<MlDsa65>::from_public_key_der(public_key) {
        Ok(pk) => pk,
        Err(_) => return false,
    };
    
    let sig = match Signature::<MlDsa65>::try_from(signature_bytes) {
        Ok(s) => s,
        Err(_) => return false,
    };

    pk.verify(message, &sig).is_ok()
}
