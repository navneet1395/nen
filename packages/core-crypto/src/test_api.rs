use ml_kem::{MlKem768, KemCore};

fn test_api() {
    let mut rng = rand::rngs::OsRng;
    let (pk, sk) = MlKem768::generate(&mut rng);
    let (ct, ss) = pk.encapsulate(&mut rng);
    let ss2 = sk.decapsulate(&ct);
}
