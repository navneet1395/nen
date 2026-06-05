# Isogeny: Post-Quantum Cryptography Monorepo

Welcome to the **Isogeny** monorepo. Isogeny is an elite, zero-boilerplate End-to-End Encryption (E2EE) SDK designed specifically for Next.js and Vercel edge environments. It relies entirely on WebAssembly and Post-Quantum Cryptography (ML-KEM 768 / Kyber).

This repository is structured as a monorepo containing the core cryptographic engine, the server/client TypeScript SDKs, and the demonstration applications.

---

## 🏗 Repository Architecture

Isogeny relies on a Bottom-Up architecture. Changes flow from the Rust core up to the TypeScript SDKs.

- **`packages/core-crypto/`**: The heart of Isogeny. Written in Rust, this contains the implementations for ML-KEM (Kyber-768) and ChaCha20-Poly1305. It compiles into a `.wasm` file and exposes JavaScript bindings via `wasm-bindgen`.
- **`packages/isogeny-server/`**: The Next.js Backend SDK. Contains the session manager (using `globalThis` for HMR survival), the API route handlers (`/handshake`, `/status`, `/terminate`), and the `withIsogeny` Higher-Order Function (Wrapper).
- **`packages/isogeny-client/`**: The Frontend React SDK. Handles the client-side WebAssembly execution, automates key rotation, and intercepts requests via the custom `pqcfetch` method.
- **`apps/demo/`**: A working Next.js App Router project that integrates both SDKs to demonstrate a completely encrypted client-server payload loop.
- **`apps/www/`**: The Next.js product marketing and documentation website.

---

## 🛠 Developer Setup & Compilation

If you are a developer looking to build, run, and modify this repository, follow these steps.

### 1. Prerequisites
- **Node.js**: v18+ 
- **Rust**: Install via `rustup` (https://rustup.rs/)
- **wasm-pack**: Install via `cargo install wasm-pack`

### 2. Compiling the Cryptography Engine
Whenever you make changes to the Rust code inside `packages/core-crypto/src`, you **must** recompile the WebAssembly bindings before the TypeScript packages can use them.

```bash
cd packages/core-crypto
./build.sh
```
*Note: `build.sh` uses `wasm-pack` to build the WebAssembly for both Node.js (server) and Web (client) targets, and then merges the bindings.*

### 3. Building the TypeScript SDKs
The SDKs are bundled using `tsup`. If you modify `isogeny-client` or `isogeny-server`, you must rebuild them.

```bash
# Build the Server SDK
cd packages/isogeny-server
npm run build

# Build the Client SDK
cd packages/isogeny-client
npm run build
```

### 4. Running the Demo & Tests
Once the packages are built, you can run the applications and test scripts.

```bash
# Run the lifecycle API tests (Simulates handshakes and auto-recovery)
node scripts/test-lifecycle.js

# Run the performance stress test
node scripts/stress-test.js

# Start the Demo Application
cd apps/demo
npm run dev
```

---

## 🧑‍💻 How to Contribute & Make Changes

If you want to extend Isogeny, here is where you should look:

### Modifying Cryptography (Rust)
If you want to add a new algorithm (e.g., ML-DSA for signatures):
1. Navigate to `packages/core-crypto/src/`.
2. Add your logic to a new module (e.g., `sig.rs`) and expose it in `lib.rs` using `#[wasm_bindgen]`.
3. Run `./build.sh` in the `core-crypto` folder.
4. Update the TypeScript interfaces in `isogeny-client` and `isogeny-server` to utilize the new Wasm exports.

### Adding New API Methods (Server)
If you want to add a new session management feature (e.g., forcing a session rotation from the server):
1. Navigate to `packages/isogeny-server/src/middleware.ts`.
2. Export a new handler function (e.g., `export async function handleForceRotate()`).
3. Update `packages/isogeny-server/src/index.ts` to export your new function.
4. Run `npm run build` in `isogeny-server`.
5. Expose the route in `apps/demo/src/app/api/isogeny/[action]/route.ts`.

### Updating the Developer Wrapper
The `withIsogeny` wrapper is located in `packages/isogeny-server/src/wrapper.ts`. If you want to change how headers are parsed (e.g., moving from `X-Isogeny-Session` to a secure cookie), make the change there.

### Enhancing the Client SDK
The `IsogenyClient` class is located in `packages/isogeny-client/src/index.ts`. If you want to add interceptors, modify `pqcfetch()`, or add event listeners for when keys rotate, add them to this class.
