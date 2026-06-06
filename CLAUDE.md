# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Nen is application-layer, end-to-end **payload** encryption for APIs, powered by post-quantum
crypto (ML-KEM-768). It runs *on top of* TLS: TLS protects the channel, Nen keeps the JSON body
ciphertext past TLS termination (logs, DB, CDN, proxies, third-party hops). It is **not** a VPN, not a
TLS replacement, and does not do homomorphic compute.

npm-workspaces monorepo. Source of truth for behavior lives in `PROTOCOL.md`, `THREAT_MODEL.md`, and
`ERROR_CODES.md` at the repo root — read those before changing crypto, wire format, or error handling.

## Build & test commands

There is **no** root build/test script; everything runs per workspace.

```bash
# 1. Wasm core FIRST — the SDKs import `core-crypto` from the generated pkg/.
cd packages/core-crypto && ./build.sh        # needs `cargo install wasm-pack`
#   emits ../../pkg/node (CJS, for server)   and ../../pkg/bundler (ESM, for client)

# Rust tests
cd packages/core-crypto && cargo test
cargo test hmac                              # single test by substring

# TypeScript packages (jest)
npm test --workspace @withnen/server
npm test --workspace @withnen/client
npm test --workspace @withnen/ai
npm test --workspace @withnen/server -- -t "ISO-3001"   # single test by name
npm run build --workspace @withnen/server    # tsup → dist/ (CJS+ESM+.d.ts)

# Marketing/docs site
cd apps/www && npm run dev                    # http://localhost:3000
cd apps/www && npm run build
cd apps/www && npm run build:diagrams         # regenerate public/flows/*.svg from d2/ (needs the d2 CLI)
```

## Architecture (the dependency chain matters)

Build/data flow is strictly bottom-up; a change low in the stack requires rebuilding everything above:

```
core-crypto (Rust)  →  pkg/{node,bundler} (Wasm)  →  @withnen/{client,server}  →  @withnen/ai  →  apps/www
```

- **`packages/core-crypto`** — all primitives (ML-KEM-768, ML-DSA-65, ChaCha20-Poly1305, HMAC-SHA256,
  base64) from the RustCrypto crates, exposed via `#[wasm_bindgen]`. Compiles to **two** Wasm targets:
  `pkg/node` (Node/serverless) and `pkg/bundler` (browser ESM). Both `@withnen/client` and
  `@withnen/server` depend on `"core-crypto": "file:../../pkg/bundler"`.
- **`@withnen/server`** — `handleHandshake/Rotate/Terminate/Status` (mounted via a single
  `/api/nen/[action]` route), `decryptPayload`/`encryptPayload`, and the `withNen` /
  `withNenStream` DX wrappers. Pluggable `SessionStore`: `InMemorySessionStore` (default, bound to
  `globalThis` so Next.js HMR doesn't wipe keys), `RedisSessionStore`, `UpstashSessionStore` (REST
  over fetch — Edge-safe).
- **`@withnen/client`** — `NenClient` + `nenFetch`/`nenStream` (and `createNenFetch`/
  `createNenStream` factories). Handshakes once, then encrypts each request and auto-rotates on a 401.
- **`@withnen/ai`** — `createSecureOpenAI`/`createSecureAnthropic` (client) and `withSecureAI`
  (server), built on `nenStream`.

### The protocol (must stay in sync with PROTOCOL.md)

- Wire is **base64-only**: `{ ct, n }`. The legacy number-array format was removed in v0.2.0 — do not
  reintroduce array-vs-base64 branches.
- Per-request **HMAC is mandatory** (`strict: true` default). The signature covers the canonical
  string `METHOD\nPATH\nTIMESTAMP\nNONCE` — **not** the ciphertext (the AEAD tag catches body
  tampering). `withNen(handler, { strict: false })` is legacy-only.
- The ML-KEM shared secret is used **directly** as the ChaCha20 key; the HMAC key is a *separate*
  random 32-byte key issued at handshake. **There is no HKDF** — don't add docs/code claiming one.
- Replay defense: 30s timestamp window + per-session nonce tracking in the store.

### Error-code system (keep three catalogs in lockstep)

Every failure is an `NenError` carrying a stable `ISO-xxxx` code. The wire/HTTP body is
`{ error: { code, message } }` — a safe message only; the precise `hint` is logged server-side and
**never** sent over the wire. The catalog is duplicated in `ERROR_CODES.md` (canonical),
`packages/nen-server/src/errors.ts`, and `packages/nen-client/src/errors.ts` (subset). Codes
are a permanent contract: never reuse or renumber, and update all three together.

## Gotchas

- **jest cannot load the bundler Wasm (ESM).** Both client and server `jest.config.js` map
  `^core-crypto$` → `<rootDir>/../../pkg/node/core_crypto.js`, and the `test` script sets
  `NODE_OPTIONS=--localstorage-file=.jest-localstorage`. Preserve both when touching test config.
- **`dist/` is gitignored build output** — never commit it (Phase 1 did by mistake; it was untracked).
  Run `npm run build` to regenerate.
- **`apps/www` is a modified Next.js** (see `apps/www/AGENTS.md`) — mirror existing patterns in the
  repo rather than assuming standard Next.js. Docs are MDX; tables need `remark-gfm` (wired in
  `next.config.ts`), and code-block copy buttons + table styling come from `src/mdx-components.tsx`.
  Flow diagrams are authored in `d2/` and generated to `public/flows/`.

## Messaging constraints (the marketing copy lives in this repo)

When editing `apps/www` copy or any docs, keep claims precise — these were deliberate and a security
reviewer will catch overclaims:

- **Additive, never adversarial:** "TLS + Nen", never "TLS is wrong/broken".
- The trust boundary: everything **between the two endpoints** is ciphertext; the **endpoints hold
  plaintext by design**. Never claim "even a compromised server sees only ciphertext."
- The AI SDK hides prompts from *your own* infra/intermediaries, **not** from the model provider
  (inference needs plaintext). See `THREAT_MODEL.md`.
