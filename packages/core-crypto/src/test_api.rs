#[cfg(test)]
mod tests {
    use crate::kem;
    use crate::cipher;

    /// Test 1: Full KEM roundtrip — generate keypair, encapsulate, decapsulate.
    /// The shared secrets derived by both parties must be identical.
    #[test]
    fn test_kem_roundtrip_shared_secrets_match() {
        let (pk, sk) = kem::generate_keypair();
        let (shared_secret_sender, ciphertext) = kem::encapsulate(&pk).unwrap();
        let shared_secret_receiver = kem::decapsulate(&ciphertext, &sk).unwrap();
        assert_eq!(shared_secret_sender, shared_secret_receiver, "Shared secrets must match after encap/decap");
        assert_eq!(shared_secret_sender.len(), 32, "Shared secret must be 32 bytes");
    }

    /// Test 2: Full ChaCha20-Poly1305 roundtrip — encrypt then decrypt.
    /// The recovered plaintext must exactly match the original.
    #[test]
    fn test_chacha20_roundtrip_plaintext_matches() {
        let key = vec![0x42u8; 32]; // 32-byte key
        let nonce = cipher::generate_nonce();
        let plaintext = b"Hello Isogeny! This is a secret message.";

        let ciphertext = cipher::encrypt(&key, &nonce, plaintext).unwrap();
        let decrypted = cipher::decrypt(&key, &nonce, &ciphertext).unwrap();

        assert_eq!(decrypted, plaintext.to_vec(), "Decrypted text must match original plaintext");
    }

    /// Test 3: Decrypt with wrong key must fail (AEAD tag verification).
    #[test]
    fn test_decrypt_with_wrong_key_fails() {
        let correct_key = vec![0x42u8; 32];
        let wrong_key = vec![0x99u8; 32];
        let nonce = cipher::generate_nonce();
        let plaintext = b"Secret data";

        let ciphertext = cipher::encrypt(&correct_key, &nonce, plaintext).unwrap();
        let result = cipher::decrypt(&wrong_key, &nonce, &ciphertext);

        assert!(result.is_err(), "Decryption with wrong key must return an error");
    }

    /// Test 4: Decrypt with tampered ciphertext must fail (AEAD integrity check).
    #[test]
    fn test_decrypt_tampered_ciphertext_fails() {
        let key = vec![0x42u8; 32];
        let nonce = cipher::generate_nonce();
        let plaintext = b"Tamper test data";

        let mut ciphertext = cipher::encrypt(&key, &nonce, plaintext).unwrap();
        // Flip one byte in the ciphertext
        if !ciphertext.is_empty() {
            ciphertext[0] ^= 0xFF;
        }
        let result = cipher::decrypt(&key, &nonce, &ciphertext);

        assert!(result.is_err(), "Decryption of tampered ciphertext must return an error");
    }

    /// Test 5: Encapsulate with invalid (truncated) public key must fail.
    #[test]
    fn test_encapsulate_with_invalid_pk_fails() {
        let invalid_pk = vec![0u8; 100]; // Way too short for Kyber-768 (needs 1184)
        let result = kem::encapsulate(&invalid_pk);
        assert!(result.is_err(), "Encapsulation with invalid public key must fail");
    }

    /// Test 6: Decapsulate with invalid ciphertext must fail.
    #[test]
    fn test_decapsulate_with_invalid_ct_fails() {
        let (_pk, sk) = kem::generate_keypair();
        let invalid_ct = vec![0u8; 50]; // Way too short for Kyber-768 (needs 1088)
        let result = kem::decapsulate(&invalid_ct, &sk);
        assert!(result.is_err(), "Decapsulation with invalid ciphertext must fail");
    }

    /// Test 7: Nonce generation produces unique 12-byte values.
    #[test]
    fn test_nonce_generation_unique_and_correct_length() {
        let nonce1 = cipher::generate_nonce();
        let nonce2 = cipher::generate_nonce();
        assert_eq!(nonce1.len(), 12, "Nonce must be 12 bytes");
        assert_ne!(nonce1, nonce2, "Two generated nonces must not be identical");
    }

    /// Test 8: Public key and secret key have the correct sizes.
    #[test]
    fn test_keypair_sizes() {
        let (pk, sk) = kem::generate_keypair();
        assert_eq!(pk.len(), 1184, "Public key must be 1184 bytes (Kyber-768)");
        assert_eq!(sk.len(), 2400, "Secret key must be 2400 bytes (Kyber-768)");
    }
}
