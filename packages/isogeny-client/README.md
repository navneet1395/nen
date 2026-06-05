# Isogeny Client SDK (`@isogeny/client`)

The official browser/frontend SDK for the Isogeny Post-Quantum Cryptography middleware.

## 🧠 Internal Architecture

This package provides a TypeScript class `IsogenyClient`. It has three primary responsibilities:
1. **Handshake Management**: Executing the ML-KEM Kyber key generation in WebAssembly, transmitting the public key to the server, and decapsulating the returned ciphertext into a shared 32-byte symmetric key.
2. **Payload Interception (`pqcfetch`)**: Acting as a drop-in replacement for the native `fetch` API. It automatically intercepts JSON bodies, encrypts them using ChaCha20-Poly1305, injects the `X-Isogeny-Session` header, and decrypts the response.
3. **Auto-Recovery**: If a session is lost on the server (e.g., Node.js restarts and drops its in-memory map), `pqcfetch` catches the HTTP 401 response, automatically forces a background `.rotate()`, and seamlessly retries the encrypted request.

## 🛠 Compilation Guide

This package is compiled using `tsup`.

```bash
# Run this from inside packages/isogeny-client/
npm install
npm run build
```

The build process outputs to `dist/index.js` (CJS) and `dist/index.mjs` (ESM), along with TypeScript definition files.

## 🧑‍💻 Contribution Guide

To modify the client behavior:
1. Edit `src/index.ts`.
2. Re-run `npm run build`.

### Extending `pqcfetch`
If you need to support streaming responses (e.g., Server-Sent Events or WebSockets) instead of just static JSON payloads, you must modify the response handling inside `pqcfetch()`. Currently, it only attempts decryption if `response.headers.get('content-type')` includes `application/json`.

### Managing Session State
The `sessionId` and `sharedSecret` are currently stored in the volatile memory of the `IsogenyClient` instance. If you want to persist the `sessionId` across browser reloads (though the key itself should never touch `localStorage`!), you can modify the class to accept a storage adapter.
