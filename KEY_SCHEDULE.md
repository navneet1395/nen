# Nen V3 Key Schedule (NEN-PROTOCOL-V3)

This is the artifact an external reviewer reads to verify that **no secret key
material crosses the wire**. It sits next to [PROTOCOL.md](./PROTOCOL.md) and
[THREAT_MODEL.md](./THREAT_MODEL.md).

## The fix it encodes

V1/V2 used the ML-KEM shared secret *directly* as the ChaCha20 key and shipped a
*separate, random* HMAC key in the handshake response. The encryption key was
KEM-protected, but the MAC key was only TLS-protected, so it leaked at exactly
the TLS-termination points Nen exists to defend (proxies, logs, APM, CDN).

**V3 transmits nothing secret.** Both keys are derived locally on each side from
the handshake shared secret using HKDF-SHA256 with domain-separated,
version-pinned `info` labels.

## Derivation

```
            ML-KEM-768                         X25519 (hybrid mode only)
        encapsulate/decapsulate              ephemeral DH on both sides
                │                                      │
          mlkem_ss (32B)                         x25519_ss (32B)
                │                                      │
                └──────────────┬───────────────────────┘
                               ▼
   hybrid mode:  ss = HKDF-SHA256( x25519_ss || mlkem_ss , info="nen/v3 hybrid" )
   pqc-only:     ss = mlkem_ss
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                      ▼
  k_enc = HKDF-SHA256(ss, "nen/v3 enc")   k_mac = HKDF-SHA256(ss, "nen/v3 mac")
     32B → ChaCha20-Poly1305 key             32B → HMAC-SHA256 key
```

- **No salt.** The IKM is already a uniformly-random KEM/DH secret; domain
  separation is provided entirely by the `info` label.
- **Concatenation order is fixed:** classical first (`x25519_ss`), then PQC
  (`mlkem_ss`). Both sides MUST agree.
- **Labels are version-pinned.** Changing a label is a protocol break. The full
  set: `nen/v3 enc`, `nen/v3 mac`, `nen/v3 hybrid`, `nen/v3 resume` (T4, reserved),
  `nen/v3 ratchet` (T5, reserved).

## What's on the wire

| Direction | Fields | Secret? |
| :-- | :-- | :-- |
| client → server | `pk_kem`, `pk_x` (hybrid), `securityMode` | public keys only |
| server → client | `sid`, `ct`, `pk_x_server` (hybrid) | public / KEM ciphertext only |
| server → client (identityMode:'pqc') | `server_nonce`, `server_sig`, `server_id_pk` | signature + nonce, no key material |

There is **no** `hmac` field (V2 had one). `k_enc` and `k_mac` never appear on
the wire in any mode.

## Transcript binding (identityMode:'pqc')

The server's ML-DSA signature covers a length-prefixed transcript, not just the
client public key:

```
transcript = SHA-256( len‖client_pk_kem ‖ len‖client_pk_x ‖ len‖server_nonce ‖ len‖sid )
```

This gives the client TLS-independent server authentication and binds the `sid`
to the transcript (channel binding) so a stolen `sid` cannot be reused against a
different transcript. A mismatch surfaces as `ISO-3007`; a bad/absent server
signature as `ISO-3006`.
