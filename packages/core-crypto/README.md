# Core Crypto (`core-crypto`)

This is the foundation of the Isogeny framework. It contains the raw Post-Quantum Cryptography implementations written in Rust and exposes them as a WebAssembly (Wasm) module.

## 🧠 Internal Architecture

This package uses:
1. **`pqcrypto-kyber`**: For the FIPS-203 ML-KEM (Kyber-768) implementation.
2. **`chacha20poly1305`**: For authenticated symmetric encryption (AEAD).
3. **`wasm-bindgen`**: To expose these Rust functions to JavaScript.

### Files
- `src/kem.rs`: Handles Keypair Generation, Encapsulation, and Decapsulation.
- `src/cipher.rs`: Handles ChaCha20-Poly1305 Encrypt/Decrypt and Nonce generation.
- `src/lib.rs`: The main entry point where functions are annotated with `#[wasm_bindgen]`.

## 🛠 Compilation Guide

To compile this Rust code into WebAssembly that works natively in Next.js, we use a custom build script.

**Why a custom build script?**
Next.js server-side code (Node.js) requires the `nodejs` WebAssembly target, while the client-side browser code requires the `web` target. We use `wasm-pack` to compile *both* and merge them.

```bash
# Run this from inside packages/core-crypto/
./build.sh
```

If the build succeeds, you will see a `dist/` directory generated. The `isogeny-client` and `isogeny-server` packages point directly to this `dist/` folder via their `package.json` dependencies (`"core-crypto": "file:../core-crypto/dist"`).

## 🧑‍💻 Contribution Guide

If you want to add a new cryptographic primitive:

1. Add your Rust dependency in `Cargo.toml`.
2. Create a new file (e.g., `src/hash.rs`) and implement your logic.
3. In `src/lib.rs`, add `pub mod hash;` and expose your function using `#[wasm_bindgen]`:
   ```rust
   #[wasm_bindgen]
   pub fn my_new_hash(data: &[u8]) -> Vec<u8> {
       // logic
   }
   ```
4. Run `./build.sh`.
5. Head over to `packages/isogeny-server` or `packages/isogeny-client` and import your new function:
   ```typescript
   import { my_new_hash } from 'core-crypto';
   ```
