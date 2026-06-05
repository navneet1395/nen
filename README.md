# Isogeny

**Post-Quantum Cryptography for the Modern Web.**

Isogeny is a drop-in End-to-End Encryption (E2EE) SDK built specifically for modern serverless architectures like Next.js. It packages the **FIPS-203 standard ML-KEM (Kyber-768)** and **ChaCha20-Poly1305** into a pure WebAssembly module that runs natively in the browser, Node.js, and Vercel Edge functions.

## The Problem
Traditional E2EE relies on RSA or Elliptic Curve Cryptography (ECC) to exchange symmetric keys securely. With the rapid advancement of quantum computing, these classical algorithms are fundamentally compromised. Furthermore, most existing cryptographic libraries require compiled C/C++ bindings, which fail instantly in edge and serverless environments.

## The Solution
Isogeny provides a seamless Developer Experience (DX) for securing your API routes against "Store Now, Decrypt Later" (SNDL) attacks. 

- **Post-Quantum Key Exchange:** ML-KEM 768 handshakes generated natively in WebAssembly.
- **Perfect Forward Secrecy:** Session keys are kept in memory and rotated automatically.
- **Serverless Ready:** Zero native dependencies. Guaranteed to run in Next.js and Vercel.
- **Zero-Boilerplate DX:** The `withIsogeny` wrapper makes your API routes secure instantly.

## Repository Structure

- `core-crypto/`: The Rust implementation of ML-KEM and ChaCha20, compiled to WebAssembly.
- `packages/isogeny-server/`: The Next.js server middleware and DX wrapper.
- `packages/isogeny-client/`: The browser SDK for handshakes and encrypted fetching.
- `apps/demo/`: A demonstration Next.js application using the SDK.
- `apps/www/`: The official product and documentation website.

## Getting Started

Visit the [Documentation](http://localhost:3001/docs) running in `apps/www` to get started, or run the stress tests in `scripts/`.

```bash
# Run the Next.js Demo App
cd apps/demo
npm run dev

# Run the Isogeny Marketing Website
cd apps/www
npm run dev

# Run the performance stress test
node scripts/stress-test.js
```

## License
MIT
