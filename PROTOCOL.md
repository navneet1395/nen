# NEN-PROTOCOL-V3

The wire protocol spoken between `@withnen/client` and `@withnen/server`. This
document describes the protocol **as implemented today** — it is the artifact a
security reviewer or auditor reads. Where a value is hardcoded in the code, it is
stated here exactly.

> **V3 (v0.4.0) — hardened key exchange.** Nothing secret crosses the wire. Both
> the ChaCha20 key and the HMAC key are derived locally on each side via
> HKDF-SHA256 from the handshake shared secret (no more plaintext MAC key). The
> handshake is **hybrid** by default (X25519 + ML-KEM-768) so the session is safe
> if either algorithm is broken, and `identityMode:'pqc'` now binds a signed
> **transcript** for TLS-independent server authentication + channel binding. See
> [KEY_SCHEDULE.md](./KEY_SCHEDULE.md). This is a wire-breaking change from V2 (§8).
>
> **V2 (v0.3.0) — bidirectional & method-agnostic.** The per-request nonce moved
> from the body into the `X-Nen-Nonce` header, so **every** method is
> authenticated (including bodyless `GET`/`HEAD`/`DELETE`) and the response is
> **always** encrypted. A request body, when present, is `{ ct }`.

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
| Classical key agreement (hybrid) | X25519 | RFC 7748 | RustCrypto `x25519-dalek`. Combined with ML-KEM per NIST SP 800-56C. |
| Key derivation | HKDF-SHA256 | RFC 5869 | Domain-separated `info` labels (`nen/v3 enc`, `nen/v3 mac`, `nen/v3 hybrid`). |
| Payload encryption (AEAD) | ChaCha20-Poly1305 | RFC 8439 | 256-bit key, 96-bit nonce, 128-bit tag. |
| Per-request authentication | HMAC-SHA256 | FIPS 198-1 | Over a canonical request string (§4). |
| Optional identity signature | ML-DSA-65 | FIPS 204 | RustCrypto `ml-dsa`. Signs the handshake transcript (§6). |

### Sizes (bytes)

| Artifact | Size |
| :-- | :-- |
| ML-KEM-768 public key | 1184 |
| ML-KEM-768 secret key | 2400 |
| ML-KEM-768 ciphertext | 1088 |
| X25519 public / secret key | 32 / 32 |
| Shared secret (per component, and after combine) | 32 |
| Derived `k_enc` / `k_mac` | 32 / 32 |
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
| POST | `/api/nen/rekey` | In-session key ratchet (no KEM) — §7 | `handleRekey` |
| POST | `/api/nen/terminate` | Destroy a session (logout / PFS) | `handleTerminate` |
| GET  | `/api/nen/status` | Liveness check for a session id | `handleStatus` |
| *any* | developer routes | Encrypted request/response (§4) or stream (§5) | `withNen` / `withNenStream` |

---

## 3. Handshake (one-time per session)

Default `securityMode: 'hybrid'` (X25519 + ML-KEM-768) shown; `'pqc-only'` omits
the X25519 leg (`pk_x` / `pk_x_server`) and uses `ss = mlkem_ss`.

```
Client                                              Server
  │  generate ML-KEM-768 keypair (pk_kem, sk_kem)
  │  generate X25519 keypair (pk_x, sk_x)        // hybrid only
  │  POST /api/nen/handshake
  │     { "pk_kem": b64, "pk_x": b64, "securityMode": "hybrid" }  ──▶
  │                                  (mlkem_ss, ct) = ML-KEM.encapsulate(pk_kem)
  │                                  (sk_xs, pk_xs)  = X25519.keypair()
  │                                  x25519_ss = X25519.dh(sk_xs, pk_x)
  │                                  ss   = HKDF(x25519_ss || mlkem_ss, "nen/v3 hybrid")
  │                                  k_enc = HKDF(ss, "nen/v3 enc")
  │                                  k_mac = HKDF(ss, "nen/v3 mac")
  │                                  sid  = uuid();  store sid → { k_enc, k_mac }
  │                                  [ identityMode:'pqc' (§6):
  │                                    server_nonce = random(32)
  │                                    transcript   = H(pk_kem||pk_x||server_nonce||sid)
  │                                    server_sig   = ML-DSA.sign(idSk, transcript) ]
  │     ◀── { "sid", "ct": b64, "pk_x_server": b64
  │            [, "server_nonce", "server_sig", "server_id_pk"] }
  │  mlkem_ss = ML-KEM.decapsulate(ct, sk_kem);  wipe sk_kem
  │  x25519_ss = X25519.dh(sk_x, pk_x_server);   wipe sk_x
  │  ss = HKDF(x25519_ss || mlkem_ss, "nen/v3 hybrid")
  │  [ identityMode:'pqc': recompute transcript, verify server_sig → ISO-3006/3007 ]
  │  k_enc = HKDF(ss, "nen/v3 enc");  k_mac = HKDF(ss, "nen/v3 mac")
  │  store { sid, k_enc, k_mac }
```

- **No key material is ever transmitted.** The response carries only `sid`, the
  KEM ciphertext `ct`, the server's X25519 public key `pk_x_server` (hybrid), and
  — in `identityMode:'pqc'` — a transcript signature. There is **no** `hmac`
  field; both keys are HKDF-derived locally (see KEY_SCHEDULE.md). This is the
  direct fix for the V2 finding that the MAC key was shipped in plaintext.
- Both sides **zeroize** their ephemeral secret keys immediately after use.
- Missing/garbled `pk_kem` (or missing `pk_x` in hybrid) → `ISO-1001`. Server
  identity signature invalid → `ISO-3006`. Transcript mismatch → `ISO-3007`.
  Encapsulation failure → `ISO-1002`.

---

## 4. Encrypted request / response

Every call to a `withNen`-wrapped route, for **any** HTTP method.

**Method matrix**

| Method | Authenticated | Request body encrypted | Response body encrypted |
| :-- | :-: | :-: | :-: |
| `GET` | ✅ | — (no body) | ✅ |
| `HEAD` | ✅ | — | n/a — no body per HTTP spec; metadata headers only |
| `DELETE` | ✅ | optional | ✅ |
| `POST` / `PUT` / `PATCH` | ✅ | ✅ | ✅ |

**Request**

```
Headers (ALL methods):
  X-Nen-Session:    <sid>
  X-Nen-Timestamp:  <unix_ms>
  X-Nen-Nonce:      base64(n)          // per-request nonce — ALWAYS present
  X-Nen-Signature:  base64( HMAC-SHA256(k_mac, canonical) )
Body (only when the method carries one):
  { "ct": base64( AEAD.encrypt(k_enc, n, plaintext) ) }
```

The per-request nonce `n` lives in the `X-Nen-Nonce` header (not the body), so it
exists for bodyless methods too. When a body is present it is sealed under that
same `n`; the body therefore carries only `{ ct }`.

**Canonical string** (exact bytes that are HMAC'd):

```
METHOD \n PATH \n TIMESTAMP \n NONCE
```

- `PATH` is the URL pathname only (no host, no query). Client and server **must**
  derive it identically — a path-vs-full-URL mismatch is the most common cause of
  `ISO-3002`. (The client uses `new URL(endpoint).pathname`; the server uses
  `new URL(req.url).pathname`.)
- `NONCE` is the base64 `X-Nen-Nonce` value — **never** empty (V1 used `""` for
  bodyless requests, which made bodyless replay protection impossible; V2 fixes
  this).

**Server verification order** (in `verifyRequest`, runs for **every** method):

1. Session lookup. Missing → `ISO-2002`.
2. `X-Nen-Nonce` present. Missing → `ISO-3005`.
3. **HMAC is mandatory** whenever the session has a `k_mac` (it always does):
   - no signature → `ISO-3001` (this is the auth-downgrade guard),
   - bad signature → `ISO-3002`,
   - `|now − timestamp| > 30_000 ms` → `ISO-3003`.
   `strict: false` on `withNen` disables this for explicitly opted-in legacy
   clients only.
4. Nonce replay: the `X-Nen-Nonce` value must be unseen for this session (when the
   store implements `hasNonce`/`trackNonce`). Reused → `ISO-5001`.
5. **Only if a body is present** (`decryptBody`): AEAD-decrypt `{ ct }` under the
   header nonce. Tag failure → `ISO-4001`. Decrypted non-JSON → `ISO-4003`.

**Response** (always encrypted)

```
Body: { "ct": base64( AEAD.encrypt(k_enc, n', response) ), "n": base64(n') }
```

with a fresh random server nonce `n'` (independent of the request nonce). The
client decrypts; an AEAD failure on the response surfaces as `ISO-4001`
client-side. `HEAD` is the one exception — it is authenticated and the handler
runs, but the response carries no body (per HTTP spec); a `Content-Length` header
reflects the size the encrypted body would have had.

**A note on `GET` query strings.** A `GET`'s URL is request-line metadata — logged
by proxies, CDNs, and access logs — so query *values* cannot be confidential while
the request stays a real `GET`. The pathname is integrity-protected (it is in the
canonical string) and the **response** is encrypted, but for **secret selectors**
use `POST` with an encrypted body (this is why the demo's search is
`POST /api/notes/search`).

---

## 5. Encrypted streaming (SSE)

`withNenStream` returns a `text/event-stream`. The request leg is identical to §4
and is authenticated for **every** method — a bodyless **streaming `GET`**
(subscribe-style encrypted SSE) is supported. (Pre-V2, the stream wrapper only
verified HMAC inside its `POST`/`PUT`/`PATCH` branch, so a streaming `GET` skipped
authentication entirely — that gap is closed.) The response:

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
- **v3 — ML-DSA transcript identity (opt-in).** With `identityMode: 'pqc'`, the
  **server** holds an ML-DSA-65 identity key (configured via `setServerIdentity`)
  and signs the handshake **transcript**
  `H(client_pk_kem || client_pk_x || server_nonce || sid)` — not just the client
  public key. The client recomputes the transcript and verifies the signature
  (optionally against a pinned `serverIdentityKey`), giving a **TLS-independent**
  trust root: it authenticates the *server* and closes MITM-on-first-contact.
  Binding the `sid` into the transcript is channel binding — a stolen `sid` cannot
  be reused against a different transcript. Verification is **one-time**, at
  handshake. Bad/absent server signature → `ISO-3006`; transcript mismatch →
  `ISO-3007`.

Per-request authenticity is always HMAC (§4), never a PQC signature, so the hot
path stays small and fast.

---

## 7. Session lifecycle & key storage

- **Server store:** pluggable `SessionStore` (`InMemorySessionStore` default,
  `RedisSessionStore`/`UpstashSessionStore` for shared/edge). Holds the two
  **derived** keys `{ encKey, macKey }` per `sid` plus per-session nonce tracking,
  all under a TTL. The raw shared secret is discarded after derivation.
- **Client store:** `encKey`, `macKey`, and `sid` live in module/instance-scoped
  memory only — **never** `localStorage`, cookies, or IndexedDB. They are lost on
  page refresh (a fresh handshake follows). Each browser tab handshakes
  independently and holds its own session.
- **Rotation:** `rotate()` performs a fresh handshake and swaps keys. On a `401`,
  the client auto-rotates once and retries (`_rotationInProgress` guards against
  loops).
- **Rekey ratchet (V3, T5):** `client.rekey()` → `POST /api/nen/rekey`, an
  **authenticated** request signed with the current `macKey`. The server advances
  both keys via a one-way ratchet `k' = HKDF(k, "nen/v3 ratchet")` and the client
  advances identically — no KEM round trip and **no key material on the wire**.
  This gives forward secrecy *within* a session: a compromised key epoch cannot
  read a later epoch's requests. A failed/desynced rekey falls back to `rotate()`.
- **Termination:** `terminate()` deletes the server session (forward secrecy) and
  clears client state.

### Compliance attestation (V3, T7)

`issueAttestation({ endpoint, securityMode?, from?, to? })` emits signed,
timestamped evidence that an endpoint negotiated the V3 post-quantum suite —
`{ v: "NEN-ATTESTATION-1", endpoint, protocol: "NEN-PROTOCOL-V3", suite,
securityMode, from?, to?, issuedAt }`, signed with the opt-in ML-DSA server
identity (`setServerIdentity`). `verifyAttestation(att, sig, pk)` checks it
offline against the signer's public key — no third-party CA involved. This is the
artifact an auditor asks for; it never exposes session keys.

---

## 8. Versioning

This is `NEN-PROTOCOL-V3` (packages `v0.4.0`). Wire-breaking changes require a
major protocol bump and a lockstep client+server release; both packages are
first-party, so there is no third-party straddling a version boundary.

**V2 → V3 (the breaking delta):**

- **No secret on the wire.** The handshake response dropped the `hmac` field.
  Both `k_enc` (ChaCha20) and `k_mac` (HMAC) are derived locally via HKDF-SHA256
  from the shared secret with domain-separated labels (KEY_SCHEDULE.md). The
  session store now holds `{ encKey, macKey }` instead of `{ sharedSecret, hmacKey }`.
- **Hybrid by default.** The handshake carries `pk_kem` + `pk_x`; the response
  carries `ct` + `pk_x_server`. The session secret is
  `HKDF(x25519_ss || mlkem_ss, "nen/v3 hybrid")`. `securityMode: 'pqc-only'`
  restores the ML-KEM-only secret.
- **Transcript-bound identity.** `identityMode:'pqc'` now authenticates the
  **server** via an ML-DSA signature over `H(pk_kem||pk_x||server_nonce||sid)`,
  with channel binding. New codes `ISO-3006` / `ISO-3007`.
- A `v0.3.x` client against a `v0.4.0` server (or vice-versa) fails cleanly: the
  field names (`pk` vs `pk_kem`), the missing `hmac`, and the derived-vs-random
  MAC key all diverge, so there is **no silent downgrade**.

**V1 → V2 (the prior breaking delta):**

- The per-request nonce moved from the request body into the `X-Nen-Nonce` header.
  It is now present on **every** request and is the value used in the canonical
  string and for replay tracking.
- The request body shrank from `{ ct, n }` to `{ ct }` (the nonce is in the header).
- Authentication now runs for **all** methods, including bodyless `GET`/`HEAD`/
  `DELETE` and streaming `GET`. New code `ISO-3005` (`AUTH_NONCE_MISSING`) covers a
  request that arrives without `X-Nen-Nonce`.

Error codes are a **stable contract** and are never reused or renumbered.
