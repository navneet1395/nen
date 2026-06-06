# Isogeny Error Codes

Every failure inside the Isogeny layer carries a stable `ISO-xxxx` code. **This is
the single source of truth** — the TypeScript catalogs in
`packages/isogeny-server/src/errors.ts` and `packages/isogeny-client/src/errors.ts`
mirror this table.

## Why codes exist

When an Isogeny request fails, the cause is almost always in *our* layer — key
exchange, HMAC, AEAD, replay, or wire format — not in your application logic. You
should never have to read a stack trace and reverse-engineer the cryptography.

So:

- The failure surfaces as a code (`ISO-3001`) plus a **safe** message — that's all
  your frontend/backend ever sees or needs to handle.
- The **precise diagnosis** (the "hint") is logged on our side and written here.
- You paste the code; we (or this table) tell you exactly what happened and the fix.

**The wire/HTTP body never contains the hint.** It is `{ "error": { "code", "message" } }`.

## How to read a code

```
ISO - 3   001
      │    └── specific error within the category
      └─────── category (see below)
```

| Range  | Category                          |
| :----- | :-------------------------------- |
| 1xxx   | Handshake / key exchange          |
| 2xxx   | Session lifecycle                 |
| 3xxx   | Authentication (HMAC / identity)  |
| 4xxx   | Cryptography (AEAD / payload)     |
| 5xxx   | Replay / nonce                    |
| 6xxx   | Wire format / encoding            |
| 7xxx   | Streaming                         |
| 9xxx   | Internal / unknown                |

## Catalog

### 1xxx — Handshake / key exchange

| Code | HTTP | Name | What it means / what to check |
| :--- | :--- | :--- | :--- |
| ISO-1001 | 400 | `HANDSHAKE_MISSING_PUBLIC_KEY` | Handshake body had neither `pk` nor `publicKey`. Client SDK out of date, or the request wasn't made by an Isogeny client. |
| ISO-1002 | 500 | `HANDSHAKE_FAILED` | ML-KEM encapsulation/decapsulation threw. Malformed/wrong-length public key, or a Wasm load failure. |
| ISO-1003 | 503 | `HANDSHAKE_NETWORK` | Couldn't reach `/api/isogeny/handshake`. Wrong `serverUrl`, server down, or CORS. |
| ISO-1004 | 502 | `HANDSHAKE_BAD_RESPONSE` | Handshake responded non-2xx or without `sid`/`ct`. The route isn't wired to `handleHandshake()`. |

### 2xxx — Session lifecycle

| Code | HTTP | Name | What it means / what to check |
| :--- | :--- | :--- | :--- |
| ISO-2001 | 409 | `SESSION_NOT_INITIALIZED` | `pqcfetch`/`pqcstream` called before a successful `handshake()`. |
| ISO-2002 | 401 | `SESSION_INVALID_OR_EXPIRED` | Server has no entry for `X-Isogeny-Session`. Expired by TTL, evicted, or this node never saw the handshake (use a shared/stateless store). |
| ISO-2003 | 401 | `SESSION_HEADER_MISSING` | No `X-Isogeny-Session` header. Not an Isogeny client, or a proxy stripped it. |

### 3xxx — Authentication

| Code | HTTP | Name | What it means / what to check |
| :--- | :--- | :--- | :--- |
| ISO-3001 | 401 | `AUTH_SIGNATURE_MISSING` | No `X-Isogeny-Signature` on a session that requires HMAC. **HMAC is mandatory** — this is the auth-downgrade guard. |
| ISO-3002 | 401 | `AUTH_SIGNATURE_INVALID` | HMAC over `METHOD\nPATH\nTIMESTAMP\nNONCE` didn't match. Tampered request, wrong key, or a canonical-string mismatch (commonly path-vs-full-URL). |
| ISO-3003 | 401 | `AUTH_TIMESTAMP_OUT_OF_WINDOW` | `X-Isogeny-Timestamp` is >30s from server time. Clock skew or a replayed/delayed request. |
| ISO-3004 | 401 | `AUTH_IDENTITY_SIGNATURE_INVALID` | Optional ML-DSA identity signature over the ephemeral key didn't verify. Wrong identity key or a MITM at handshake. |

### 4xxx — Cryptography

| Code | HTTP | Name | What it means / what to check |
| :--- | :--- | :--- | :--- |
| ISO-4001 | 400 | `CRYPTO_DECRYPT_FAILED` | ChaCha20-Poly1305 AEAD tag verification failed. Tampered/truncated ciphertext, or a desynced shared secret (try `rotate()`). |
| ISO-4002 | 500 | `CRYPTO_ENCRYPT_FAILED` | AEAD sealing of the response threw. Usually a corrupt/missing shared secret. |
| ISO-4003 | 400 | `CRYPTO_PAYLOAD_NOT_JSON` | Decryption succeeded but the plaintext wasn't valid JSON. |

### 5xxx — Replay / nonce

| Code | HTTP | Name | What it means / what to check |
| :--- | :--- | :--- | :--- |
| ISO-5001 | 409 | `REPLAY_NONCE_REUSED` | This nonce was already seen for the session. A legitimate identical retry, or an actual replay. |

### 6xxx — Wire format / encoding

| Code | HTTP | Name | What it means / what to check |
| :--- | :--- | :--- | :--- |
| ISO-6001 | 400 | `WIRE_INVALID_PAYLOAD_FORMAT` | Body was missing the `(ct, n)` base64 pair. Not an Isogeny payload, or a corrupted/truncated body. |
| ISO-6002 | 400 | `WIRE_DECODE_FAILED` | base64 decode of `ct`/`n`/`pk` failed. Truncated by a proxy, or non-base64 data. |

### 7xxx — Streaming

| Code | HTTP | Name | What it means / what to check |
| :--- | :--- | :--- | :--- |
| ISO-7001 | 502 | `STREAM_MISSING_NONCE_HEADER` | Stream response had no `X-Isogeny-Stream-Nonce`. The route didn't use `withIsogenyStream()`, or a proxy stripped it. |
| ISO-7002 | 502 | `STREAM_REQUEST_FAILED` | Stream response was non-ok or had no body. Upstream handler errored before streaming. |

### 9xxx — Internal

| Code | HTTP | Name | What it means / what to check |
| :--- | :--- | :--- | :--- |
| ISO-9000 | 500 | `INTERNAL` | Unclassified failure wrapped by `IsogenyError.from()`. The original error is in the logged `detail`. |

## Programmatic lookup

Both SDKs export a reverse lookup so tooling/support can resolve a code from a log:

```ts
import { describeIsogenyCode } from '@isogeny/server'; // or '@isogeny/client'

describeIsogenyCode('ISO-3001');
// → { code: 'ISO-3001', status: 401, message: '…', hint: '…' }
```

## Rules for adding a code

1. Never reuse or renumber a code — they are a stable contract.
2. `message` must be safe to expose (no internals). `hint` holds the real diagnosis.
3. Add the row here first, then mirror it in both `errors.ts` files.
