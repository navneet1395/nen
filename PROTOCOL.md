# NEN-PROTOCOL-V1

The wire protocol spoken between `@withnen/client` and `@withnen/server`. This
document describes the protocol **as implemented today** — it is the artifact a
security reviewer or auditor reads. Where a value is hardcoded in the code, it is
stated here exactly.

- **Layer:** application (Layer 7), on top of TLS. Nen assumes TLS is present
  and does not replace it (see [THREAT_MODEL.md](./THREAT_MODEL.md)).
- **Goal:** keep the request/response/stream *payload* as ciphertext across every
  hop and at-rest store between the two Nen endpoints, with post-quantum key
  exchange so recorded ciphertext stays safe against harvest-now-decrypt-later.
- **Error codes:** every failure path is a stable `ISO-xxxx` code — see
  [ERROR_CODES.md](./ERROR_CODES.md).

---

## 1. Cryptographic parameters

| Role | Algorithm | Standard | Notes |
| :-- | :-- | :-- | :-- |
| Key encapsulation (KEM) | ML-KEM-768 | FIPS 203 | RustCrypto `ml-kem`. NIST Level 3. |
| Payload encryption (AEAD) | ChaCha20-Poly1305 | RFC 8439 | 256-bit key, 96-bit nonce, 128-bit tag. |
| Per-request authentication | HMAC-SHA256 | FIPS 198-1 | Over a canonical request string (§4). |
| Optional identity signature | ML-DSA-65 | FIPS 204 | RustCrypto `ml-dsa`. Handshake only (§6). |

### Sizes (bytes)

| Artifact | Size |
| :-- | :-- |
| ML-KEM-768 public key | 1184 |
| ML-KEM-768 secret key | 2400 |
| ML-KEM-768 ciphertext | 1088 |
| Shared secret | 32 |
| HMAC session key | 32 |
| ChaCha20 nonce | 12 |
| Poly1305 tag | 16 |

All binary artifacts travel as **base64** strings (encoded/decoded inside Wasm via
`nen_to_base64` / `nen_from_base64`), never as JSON number arrays.

---

## 2. Endpoints

| Method | Path | Purpose | Handler |
| :-- | :-- | :-- | :-- |
| POST | `/api/nen/handshake` | Establish a session (§3) | `handleHandshake` |
| POST | `/api/nen/rotate` | Destroy old session, establish a new one | `handleRotate` |
| POST | `/api/nen/terminate` | Destroy a session (logout / PFS) | `handleTerminate` |
| GET  | `/api/nen/status` | Liveness check for a session id | `handleStatus` |
| *any* | developer routes | Encrypted request/response (§4) or stream (§5) | `withNen` / `withNenStream` |

---

## 3. Handshake (one-time per session)

```
Client                                              Server
  │  generate ML-KEM-768 keypair (pk, sk)
  │  POST /api/nen/handshake
  │     { "pk": base64(pk)
  │       [, "sigPk": base64(idPk), "sigOfPk": base64(sign(idSk, pk)) ] }  ──▶
  │                                          verify identity sig if present (§6)
  │                                          (ss, ct) = ML-KEM.encapsulate(pk)
  │                                          hmacKey = random(32)
  │                                          sid = uuid()
  │                                          store sid → { ss, hmacKey }
  │     ◀── { "sid": uuid, "ct": base64(ct), "hmac": base64(hmacKey) }
  │  ss = ML-KEM.decapsulate(ct, sk)
  │  store { sid, ss, hmacKey };  wipe sk (sk.fill(0))
```

- The response also includes legacy fields (`sessionId`, `ciphertext` array) for
  older clients; new clients use `sid` / `ct`.
- The client **zeroizes its ML-KEM secret key** immediately after decapsulation.
- Missing/garbled `pk` → `ISO-1001`. Identity signature invalid → `ISO-3004`.
  Encapsulation failure → `ISO-1002`.

---

## 4. Encrypted request / response

Every call to a `withNen`-wrapped route:

**Request**

```
Headers:
  X-Nen-Session:    <sid>
  X-Nen-Timestamp:  <unix_ms>
  X-Nen-Signature:  base64( HMAC-SHA256(hmacKey, canonical) )
Body (if any):
  { "ct": base64( AEAD.encrypt(ss, n, plaintext) ), "n": base64(n) }
```

**Canonical string** (exact bytes that are HMAC'd):

```
METHOD \n PATH \n TIMESTAMP \n NONCE
```

- `PATH` is the URL pathname only (no host, no query). Client and server **must**
  derive it identically — a path-vs-full-URL mismatch is the most common cause of
  `ISO-3002`.
- `NONCE` is the base64 nonce string `n` (the same string sent in the body). For a
  request with no body, `NONCE` is the empty string.

**Server verification order** (in `decryptPayload`):

1. Session lookup. Missing → `ISO-2002`.
2. Payload shape: requires a `(ct,n)` pair. Missing → `ISO-6001`.
3. **HMAC is mandatory** whenever the session has an `hmacKey` (it always does):
   - no signature → `ISO-3001` (this is the auth-downgrade guard),
   - bad signature → `ISO-3002`,
   - `|now − timestamp| > 30_000 ms` → `ISO-3003`.
   `strict: false` on `withNen` disables this for explicitly opted-in legacy
   clients only.
4. Nonce replay: the nonce string must be unseen for this session (when the store
   implements `hasNonce`/`trackNonce`). Reused → `ISO-5001`.
5. AEAD decrypt. Tag failure → response `ISO-4001`. Decrypted non-JSON → `ISO-4003`.

**Response**

```
Body: { "ct": base64( AEAD.encrypt(ss, n', response) ), "n": base64(n') }
```

with a fresh random nonce `n'`. The client decrypts; an AEAD failure on the
response surfaces as `ISO-4001` client-side.

---

## 5. Encrypted streaming (SSE)

`withNenStream` returns a `text/event-stream`. The request leg is identical to
§4. The response:

```
Headers:
  Content-Type:            text/event-stream
  X-Nen-Stream-Nonce:  base64(baseNonce)        // 12-byte base nonce
Body (SSE frames):
  data: base64( AEAD.encrypt(ss, nonce_i, chunk_i) )\n\n
  data: base64( AEAD.encrypt(ss, nonce_i, "__FIN__") )\n\n   // final frame
```

- **Per-chunk nonce:** `nonce_i = baseNonce` with its last 4 bytes (a little-endian
  `u32` at byte offset 8) XOR-ed with the chunk index `i`. Each chunk is sealed
  independently and carries its own Poly1305 tag.
- **Termination:** the stream ends with an encrypted `__FIN__` sentinel; the client
  stops on decrypting it.
- Missing `X-Nen-Stream-Nonce` → client `ISO-7001`. Non-ok / bodyless stream →
  client `ISO-7002`.

> Note: the XOR-counter nonce scheme is safe because `(ss, baseNonce)` is unique per
> response and chunk indices are unique within it. `baseNonce` MUST NOT be reused
> across responses under the same session key.

---

## 6. Identity model

The handshake establishes confidentiality; **identity** (who the server is)
is layered as follows:

- **v1 — TLS-bound (default).** The handshake runs inside the already-authenticated
  TLS channel, so server identity = the TLS certificate. Nen then adds payload
  confidentiality past TLS termination. Trade-off, stated plainly: we trust the web
  PKI for *identity* even though we do not trust it for *long-term confidentiality*
  — these are different properties.
- **v2 — ML-DSA identity (opt-in).** With `identityMode: 'pqc'`, the client also
  generates an ML-DSA-65 keypair and sends `sigPk` plus `sigOfPk = sign(idSk, pk)`.
  The server verifies the signature over the ephemeral ML-KEM public key once, at
  handshake (`nen_verify_signature`), giving a **TLS-independent** trust root
  for financial/government workloads. Verification is **one-time** — never
  per-request. Failure → `ISO-3004`.

Per-request authenticity is always HMAC (§4), never a PQC signature, so the hot
path stays small and fast.

---

## 7. Session lifecycle & key storage

- **Server store:** pluggable `SessionStore` (`InMemorySessionStore` default,
  `RedisSessionStore` for shared/edge). Holds `{ sharedSecret, hmacKey }` per `sid`
  plus per-session nonce tracking, all under a TTL.
- **Client store:** `sharedSecret`, `hmacKey`, and `sid` live in
  module/instance-scoped memory only — **never** `localStorage`, cookies, or
  IndexedDB. They are lost on page refresh (a fresh handshake follows). Each browser
  tab handshakes independently and holds its own session.
- **Rotation:** `rotate()` performs a fresh handshake and swaps keys. On a `401`,
  the client auto-rotates once and retries (`_rotationInProgress` guards against
  loops).
- **Termination:** `terminate()` deletes the server session (forward secrecy) and
  clears client state.

---

## 8. Versioning

This is `NEN-PROTOCOL-V1`. Wire-breaking changes (new canonical string, new
field names, dropping the legacy number-array fallback) require a major protocol
bump. Error codes are a **stable contract** and are never reused or renumbered.
