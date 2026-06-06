# Nen — End-to-End Encrypted APIs, Powered by Post-Quantum Cryptography

**TLS protects the channel. Nen protects the payload.** HTTPS keeps your data
safe in transit, then terminates — leaving the JSON body in plaintext across your
logs, databases, CDN, proxies, and every third-party hop. Nen keeps that
payload encrypted the whole way, all the way to the code that actually needs it,
using a post-quantum (ML-KEM-768) key exchange. **TLS + Nen.**

This is the monorepo for the Nen SDKs, the Rust/Wasm crypto core, the CLI
scaffold, and the marketing + docs site.

## ✨ Features

- **Post-quantum key exchange** — ML-KEM-768 (FIPS 203), with optional ML-DSA-65
  (FIPS 204) identity signatures at handshake.
- **Application-layer payload E2EE** — ChaCha20-Poly1305 over the ML-KEM shared
  secret; everything between the two endpoints sees only ciphertext.
- **Mandatory per-request HMAC** — HMAC-SHA256 over `METHOD\nPATH\nTIMESTAMP\nNONCE`,
  required by default (the auth-downgrade bypass is closed).
- **Compact base64 wire format** — `{ ct, n }`, under ~1.4× of raw (v0.2.0 dropped
  the legacy number-array format).
- **Encrypted SSE streaming** — `nenStream` / `withNenStream` encrypt each chunk
  with an XOR-counter nonce — ideal for LLM tokens.
- **Edge-ready sessions** — pluggable `SessionStore`: in-memory, Redis, or Upstash
  (REST, no TCP) for Edge runtimes.
- **Stable error codes** — every failure carries an `ISO-xxxx` code (see
  [`ERROR_CODES.md`](./ERROR_CODES.md)).
- **Auto key-rotation** — the client transparently re-handshakes on a 401 and retries.

## 🏗 Repository layout

```
packages/
  core-crypto/        Rust → Wasm core (ML-KEM, ChaCha20-Poly1305, HMAC, ML-DSA, base64)
  nen-client/     @withnen/client — nenFetch, nenStream, NenClient
  nen-server/     @withnen/server — withNen, withNenStream, session stores
  ai/                 @withnen/ai — createSecureOpenAI / createSecureAnthropic (the wedge)
  create-nen-app/ npx scaffold for a pre-wired Next.js app
apps/
  www/                Marketing + docs site (Next.js)
pkg/                  Generated Wasm output (node + bundler targets)
scripts/              E2E / stress / audit scripts
```

## 📚 Specs & security docs

- [`PROTOCOL.md`](./PROTOCOL.md) — NEN-PROTOCOL-V1 (the exact wire format).
- [`THREAT_MODEL.md`](./THREAT_MODEL.md) — what it does and does not protect.
- [`AUDIT_READINESS.md`](./AUDIT_READINESS.md) — test coverage and audit roadmap.
- [`ERROR_CODES.md`](./ERROR_CODES.md) — the full `ISO-xxxx` catalog.

## 🛠 Developer setup

### Prerequisites
- **Node.js** v18+
- **Rust** via [rustup](https://rustup.rs/)
- **wasm-pack** (`cargo install wasm-pack`)

### Build the crypto core
Whenever you change `packages/core-crypto/src/*`, recompile the Wasm bindings:

```bash
cd packages/core-crypto && ./build.sh   # emits ../../pkg/{node,bundler}
```

### Build the SDKs

```bash
npm install
npm run build --workspaces --if-present
```

### Test

```bash
cd packages/core-crypto && cargo test          # Rust core (16 tests)
npm test --workspace @withnen/server           # 19 tests
npm test --workspace @withnen/client           # 7 tests
npm test --workspace @withnen/ai               # 5 tests

# End-to-end / performance
node scripts/test-audit.js
node scripts/test-stress.js
```

## 🚀 Quickstart

```bash
npx create-nen-app
```

### Encrypted request

```javascript
import { createNenFetch } from '@withnen/client';
const nenFetch = createNenFetch('https://api.yourdomain.com');

const data = await nenFetch('/api/secure-data', {
  method: 'POST',
  body: JSON.stringify({ secret: 'Quantum-safe data' }),
});
// returns the decrypted JSON
```

### Encrypted streaming (SSE)

```javascript
import { createNenStream } from '@withnen/client';
const nenStream = createNenStream('https://api.yourdomain.com');

for await (const chunk of nenStream('/api/stream', {
  method: 'POST',
  body: JSON.stringify({ prompt: 'Generate secure content' }),
})) {
  console.log('Decrypted chunk:', chunk);
}
```

### Server route (Next.js)

```typescript
import { withNen } from '@withnen/server';
export const POST = withNen(async (req, body) => ({ ok: true, body }));
```

See [`packages/nen-client`](./packages/nen-client) and
[`packages/nen-server`](./packages/nen-server) for the full API.
