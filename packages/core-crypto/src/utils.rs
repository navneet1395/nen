pub fn generate_random_bytes(len: usize) -> Vec<u8> {
    let mut buf = vec![0u8; len];
    getrandom::getrandom(&mut buf).expect("Failed to get random bytes");
    buf
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_random_bytes() {
        let b1 = generate_random_bytes(12);
        let b2 = generate_random_bytes(12);
        assert_eq!(b1.len(), 12);
        assert_eq!(b2.len(), 12);
        assert_ne!(b1, b2, "Random bytes should likely not match");
    }
}
