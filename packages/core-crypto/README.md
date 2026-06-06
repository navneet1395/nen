# Core Crypto (`core-crypto`)

The foundation of Isogeny: the Post-Quantum Cryptography primitives, written in
Rust and compiled to WebAssembly via `wasm-bindgen`. The `@isogeny/client` and
`@isogeny/server` packages depend on the generated Wasm in `pkg/`.

## 🧠 Primitives (all from the audited RustCrypto crates)

| Crate | Role |
| :-- | :-- |
| `ml-kem` | ML-KEM-768 key encapsulation (FIPS 203) |
| `ml-dsa` | ML-DSA-65 identity signatures (FIPS 204) |
| `chacha20poly1305` | AEAD payload encryption (RFC 8439) |
| `hmac` + `sha2` | HMAC-SHA256 per-request authentication (FIPS 198-1) |
| `base64` | Wire encoding inside the Wasm boundary |

### Source files
- `src/kem.rs` — ML-KEM keypair generation, encapsulate, decapsulate.
- `src/cipher.rs` — ChaCha20-Poly1305 encrypt/decrypt, nonce generation.
- `src/hmac_auth.rs` — HMAC-SHA256 sign/verify.
- `src/sig.rs` — ML-DSA-65 keygen, sign, verify (optional identity).
- `src/encoding.rs` — base64 encode/decode (`isogeny_to_base64` / `isogeny_from_base64`).
- `src/utils.rs` — shared helpers / error types.
- `src/lib.rs` — the Wasm entry point; functions annotated with `#[wasm_bindgen]`.

## 🛠 Compilation

```bash
# From inside packages/core-crypto/
./build.sh
```

`build.sh` runs `wasm-pack` for **both** targets and writes them to the repo-root
`pkg/`:

- `pkg/node/` — Node.js/serverless target (used by `@isogeny/server`).
- `pkg/bundler/` — ESM bundler target (used by `@isogeny/client`).

Both SDKs depend on these via `"core-crypto": "file:../../pkg/bundler"`. The release
profile is size-optimized (`opt-level = "z"`, `lto`, `strip`, `wasm-opt -Oz`).

## 🧪 Tests

```bash
cargo test   # 16 tests: KEM round-trip, AEAD tamper detection, HMAC, signatures, base64
```

## 🧑‍💻 Adding a primitive

1. Add the crate to `Cargo.toml`.
2. Implement it in a new `src/*.rs` module.
3. Expose it from `src/lib.rs` with `#[wasm_bindgen]`:
   ```rust
   #[wasm_bindgen]
   pub fn my_new_hash(data: &[u8]) -> Vec<u8> { /* … */ }
   ```
4. Rebuild with `./build.sh` and add a `#[test]`.
5. Import it from a TypeScript package: `import { my_new_hash } from 'core-crypto';`

> The wire format is specified in [`../../PROTOCOL.md`](../../PROTOCOL.md) — keep
> changes in sync.
