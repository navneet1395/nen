use chacha20poly1305::{
    aead::{Aead, KeyInit, Payload},
    ChaCha20Poly1305, Key, Nonce,
};
use crate::utils::generate_random_bytes;

pub const NONCE_LEN: usize = 12;
pub const KEY_LEN: usize = 32;

/// Generates a random 12-byte nonce for ChaCha20-Poly1305.
pub fn generate_nonce() -> Vec<u8> {
    generate_random_bytes(NONCE_LEN)
}

/// Encrypts a plaintext payload using the given 32-byte key and 12-byte nonce.
/// Returns the ciphertext (which includes the 16-byte Poly1305 authentication tag appended).
pub fn encrypt(key_bytes: &[u8], nonce_bytes: &[u8], plaintext: &[u8]) -> Result<Vec<u8>, &'static str> {
    if key_bytes.len() != KEY_LEN {
        return Err("Invalid key length: must be 32 bytes");
    }
    if nonce_bytes.len() != NONCE_LEN {
        return Err("Invalid nonce length: must be 12 bytes");
    }

    let key = Key::from_slice(key_bytes);
    let cipher = ChaCha20Poly1305::new(key);
    let nonce = Nonce::from_slice(nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|_| "Encryption failed")?;

    Ok(ciphertext)
}

/// Decrypts a ciphertext using the given 32-byte key and 12-byte nonce.
/// Returns the original plaintext.
/// Fails if the authentication tag is invalid or if the ciphertext has been tampered with.
pub fn decrypt(key_bytes: &[u8], nonce_bytes: &[u8], ciphertext: &[u8]) -> Result<Vec<u8>, &'static str> {
    if key_bytes.len() != KEY_LEN {
        return Err("Invalid key length: must be 32 bytes");
    }
    if nonce_bytes.len() != NONCE_LEN {
        return Err("Invalid nonce length: must be 12 bytes");
    }

    let key = Key::from_slice(key_bytes);
    let cipher = ChaCha20Poly1305::new(key);
    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| "Decryption failed or data tampered")?;

    Ok(plaintext)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::generate_random_bytes;

    #[test]
    fn test_encryption_decryption_flow() {
        let key = generate_random_bytes(32);
        let nonce = generate_nonce();
        let plaintext = b"Hello, quantum world!";

        let ciphertext = encrypt(&key, &nonce, plaintext).expect("Encryption failed");
        assert_ne!(plaintext.to_vec(), ciphertext);

        let decrypted = decrypt(&key, &nonce, &ciphertext).expect("Decryption failed");
        assert_eq!(plaintext.to_vec(), decrypted);
    }

    #[test]
    fn test_tamper_detection() {
        let key = generate_random_bytes(32);
        let nonce = generate_nonce();
        let plaintext = b"Top secret data";

        let mut ciphertext = encrypt(&key, &nonce, plaintext).unwrap();
        
        // Tamper with the ciphertext (flip a bit)
        let last_idx = ciphertext.len() - 1;
        ciphertext[last_idx] ^= 1;

        let result = decrypt(&key, &nonce, &ciphertext);
        assert!(result.is_err(), "Decryption should fail on tampered data");
    }
}
