# Isogeny Server SDK (`@isogeny/server`)

The official Next.js server middleware and DX wrapper for the Isogeny Post-Quantum Cryptography framework.

## 🧠 Internal Architecture

This package is responsible for managing symmetric keys on the backend and intercepting encrypted requests.

1. **`src/store.ts` (Session Management)**: Maps `sessionId` strings to `Uint8Array` symmetric keys. 
   - **Crucial Detail:** In Next.js development mode, Hot Module Replacement (HMR) wipes local variables on every save. To prevent the server from instantly forgetting cryptographic keys during development, we bind the Map to `globalThis.__ISOGENY_SESSIONS`. In production, this falls back to a standard singleton.
2. **`src/middleware.ts` (Lifecycle Endpoints)**: Exposes `handleHandshake`, `handleStatus`, and `handleTerminate`. These functions process incoming ML-KEM public keys, run the `core-crypto` WebAssembly decapsulation, and generate standard `Response` objects.
3. **`src/wrapper.ts` (The `withIsogeny` DX Wrapper)**: A Higher-Order Function that intercepts incoming HTTP requests. It looks for the `X-Isogeny-Session` header, decrypts the `ciphertext` using ChaCha20-Poly1305, parses the underlying JSON, and feeds it into the developer's normal Route Handler. It then encrypts the return value before transmitting the HTTP response.

## 🛠 Compilation Guide

This package is compiled using `tsup`.

```bash
# Run this from inside packages/isogeny-server/
npm install
npm run build
```

The build outputs CJS and ESM to `dist/`, along with the TypeScript definition files.

## 🧑‍💻 Contribution Guide

### Adding an External Database
Currently, `store.ts` uses an in-memory `Map`. This means session keys are isolated to a single server instance. If you deploy Isogeny behind a Load Balancer (or in Vercel Edge functions where instances spin up and die instantly), **sessions will be lost.**

To make Isogeny truly stateless and scalable, you should replace the `Map` in `src/store.ts` with an external fast-cache like Redis (Upstash) or Memcached. 
1. Modify `storeSession(id, key)` to `await redis.set(id, key, { ex: 3600 })`.
2. Modify `getSession(id)` to `await redis.get(id)`.
3. Rebuild the package.

### Modifying the DX Wrapper
If you want to change how errors are reported to the frontend (e.g., returning JSON API spec errors instead of standard `{ error: '...' }` objects), modify the `catch` block inside `src/wrapper.ts`.
