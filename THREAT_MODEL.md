# Isogeny Threat Model

What Isogeny defends, what it does not, and why. Stated plainly — a security
engineer will find any gap in thirty seconds, so we name them ourselves.

See also: [PROTOCOL.md](./PROTOCOL.md), [ERROR_CODES.md](./ERROR_CODES.md).

---

## 1. The one-sentence model

> Everything **between the two Isogeny endpoints** sees only ciphertext. The two
> endpoints hold plaintext — by necessity, because someone has to read the data.

Isogeny lets the developer choose *where* those endpoints are, and thereby push the
trust boundary **inward** — past the CDN, the edge, the load balancer, the log
pipeline, the proxy, and any third-party forwarder — down to the specific code that
genuinely needs the plaintext.

This is a different threat model from TLS, not a competing one. TLS encrypts the
*channel* and stops at termination; Isogeny encrypts the *payload* and continues
past it.

---

## 2. What Isogeny PROTECTS against

| Threat | How |
| :-- | :-- |
| Payload exposure after TLS termination | The body stays ChaCha20-Poly1305 ciphertext past the TLS edge, through every intermediary, to the endpoint that decrypts. |
| CDN / load-balancer / proxy inspection | Intermediaries see only `{ ct, n }` base64 ciphertext. |
| Leakage via logs & observability | Request/response bodies captured in logs are ciphertext. |
| At-rest exposure in queues/DBs | Payloads you choose not to decrypt remain ciphertext at rest. |
| Harvest-now, decrypt-later | ML-KEM-768 key exchange — recorded ciphertext is not retroactively decryptable by a future quantum computer. **Scope:** this is Isogeny's value for at-rest payloads and legs **not** already behind PQ-TLS; the public transit leg behind Cloudflare/AWS PQ-TLS is already covered there. |
| Request tampering / forgery | HMAC-SHA256 over `METHOD\nPATH\nTIMESTAMP\nNONCE` (`ISO-3002`). |
| Replay | 30-second timestamp window (`ISO-3003`) + per-session nonce uniqueness (`ISO-5001`). |
| Auth-downgrade by dropping headers | HMAC is **mandatory** per session; a request without a signature is rejected (`ISO-3001`), not silently allowed. |
| MITM at handshake (opt-in mode) | ML-DSA-65 identity signature over the ephemeral key (`ISO-3004`). |

---

## 3. What Isogeny does NOT protect against

| Out of scope | Why |
| :-- | :-- |
| A compromised **endpoint** | The browser and the server process that terminates Isogeny hold plaintext by design. If the attacker owns that process, they see plaintext. We never claim "a compromised server sees only ciphertext." |
| Hiding plaintext from a party you send it to | E.g. an LLM provider must decrypt a prompt to run inference. Isogeny hides the payload from *intermediaries*, not from a recipient you deliberately hand plaintext to. True provider-blind compute needs self-hosting, a TEE, or FHE — out of scope. |
| XSS / malicious frontend | Code running in the page already has the plaintext and the session. |
| Stolen session tokens / JWTs | Application auth is the developer's concern; Isogeny secures the payload, not the identity of the human user. |
| Malicious logic in the developer's own handler | Isogeny hands the handler plaintext; what it does with it is out of scope. |
| Compromise of the TLS PKI for **identity** (v1) | In default mode, server identity rides the TLS cert. Use opt-in ML-DSA identity (PROTOCOL §6) for a TLS-independent root. |
| Traffic analysis / metadata | Sizes, timing, endpoints, and headers are not hidden. |
| Denial of service | Out of scope; rate limiting is the deployer's responsibility. |

---

## 4. Trust boundaries (diagram)

```
[ Browser ]──TLS──[ CDN ]──[ Edge/LB ]──[ Proxy/Logs ]──[ App process ]──▶ [ DB / 3rd-party ]
   ▲ plaintext        └─────────── ciphertext (Isogeny) ──────────┘  ▲ plaintext (chosen point)
   │                                                                  │
   └── endpoint A (holds plaintext)              endpoint B (holds plaintext) ──┘
```

The developer chooses how far right endpoint B sits. The further in, the smaller
the plaintext-exposed surface. Everything drawn as "ciphertext (Isogeny)" is
protected even against a full compromise of that hop.

---

## 5. Assumptions

- TLS is present and correctly configured (Isogeny runs above it).
- The Wasm crypto core (`core-crypto`: ML-KEM, ChaCha20-Poly1305, HMAC, ML-DSA) is
  built from the audited RustCrypto crates and not tampered with at build time.
- The server session store preserves confidentiality and integrity of
  `{ sharedSecret, hmacKey }` and enforces its TTL.
- Client and server clocks are within ~30 seconds (the replay window). Larger skew
  surfaces as `ISO-3003`, not a silent failure.

---

## 6. Residual risks we are explicit about

- **First-contact trust (v1).** Without opt-in ML-DSA identity, a TLS-PKI compromise
  could enable a MITM at handshake. Mitigation: opt-in PQC identity for high-value
  workloads.
- **Endpoint plaintext.** The strongest, simplest attack is to compromise an
  endpoint. Isogeny shrinks but cannot remove the plaintext surface.
- **Nonce-store availability.** Replay protection depends on the nonce store; a store
  that silently drops entries weakens replay defense to the 30-second window alone.
