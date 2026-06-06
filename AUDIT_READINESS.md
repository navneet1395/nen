# Nen Audit Readiness

Enterprises ask "who audited it, and how do I verify it myself?" before they trust a
security product. This is the honest current state plus the roadmap. Companion to
[PROTOCOL.md](./PROTOCOL.md) and [THREAT_MODEL.md](./THREAT_MODEL.md).

> Status legend: ✅ done · 🟡 in progress · ⬜ planned

## 1. Cryptographic foundations

- ✅ Standards-based primitives only — ML-KEM-768 (FIPS 203), ChaCha20-Poly1305
  (RFC 8439), HMAC-SHA256 (FIPS 198-1), ML-DSA-65 (FIPS 204).
- ✅ Implementations come from the audited **RustCrypto** crates (`ml-kem`,
  `chacha20poly1305`, `hmac`, `sha2`, `ml-dsa`) — Nen does not hand-roll
  primitives.
- ✅ No custom transport crypto: Nen runs above TLS (see threat model §1).

## 2. Test coverage

- ✅ 16 Rust unit tests in `core-crypto` (KEM round-trip, AEAD tamper detection,
  HMAC sign/verify, base64, signatures).
- ✅ Server suite (`@nen/server`): 17 tests — handshake, session lifecycle,
  **HMAC-mandatory downgrade-bypass regression** (`ISO-3001`), forged signature
  (`ISO-3002`), stale timestamp (`ISO-3003`), invalid session (`ISO-2002`),
  **nonce replay** (`ISO-5001`), **AEAD tamper at the HTTP layer** (`ISO-4001`),
  **invalid ML-DSA identity** (`ISO-3004`) + valid-identity acceptance.
- ✅ Client suite (`@nen/client`): 7 tests — coded error paths (`ISO-2001`,
  `ISO-1003`, `ISO-1004`), `NenError` shape, and the safe-body / no-hint-leak
  guarantee. Jest env fixed (localStorage flag + `core-crypto` mapped to the Node
  wasm build for tests).
- ✅ E2E / perf scripts: `test-lifecycle`, `test-stream`, `test-audit`, `stress-test`,
  `packet-trace`.

## 3. Negative-path / security tests (target matrix)

| Attack | Expected result | Status |
| :-- | :-- | :-- |
| Valid session, **no signature** | reject `ISO-3001` | ✅ |
| Forged HMAC | reject `ISO-3002` | ✅ |
| Stale (>30s) timestamp | reject `ISO-3003` | ✅ |
| Exact request replay (reused nonce) | reject `ISO-5001` | ✅ |
| Tampered ciphertext (AEAD) | reject `ISO-4001`, never garbled plaintext | ✅ (Rust + HTTP-level) |
| Session id without hmac key | all requests rejected | ✅ (covered by ISO-3001 path) |
| Invalid ML-DSA identity | reject `ISO-3004` | ✅ |

## 4. Published artifacts for self-verification

- ✅ `PROTOCOL.md` — exact wire format, canonical string, nonce scheme, sizes.
- ✅ `THREAT_MODEL.md` — protects / does-not-protect, assumptions, residual risks.
- ✅ `ERROR_CODES.md` — every failure path as a stable code.
- ⬜ Published **test vectors** (KEM, AEAD, HMAC canonical strings) so third parties
  can verify an independent implementation.
- ⬜ Reproducible Wasm build instructions + checksum for the shipped `core-crypto`.

## 5. Fuzzing targets (planned ⬜)

- `decryptPayload` wire parser (malformed `{ ct, n }`, oversized base64).
- Handshake body parser (malformed `pk`/`sigPk`/`sigOfPk`).
- Stream frame parser (truncated SSE, bad chunk base64, missing `__FIN__`).
- Canonical-string construction (path/URL edge cases that drive `ISO-3002`).

## 6. External review roadmap (⬜)

1. Internal threat-model sign-off (this document set).
2. Independent cryptographic review of `NEN-PROTOCOL-V1` (handshake, HMAC hot
   path, stream nonce scheme).
3. Third-party penetration test of a reference Next.js deployment.
4. Publish findings + remediations; link from the marketing site's security page.

## 7. Known gaps tracked elsewhere

- _(resolved)_ The legacy number-array wire fallback was removed in v0.2.0; the wire is now
  base64-only (`{ ct, n }`), eliminating the second parse path.
