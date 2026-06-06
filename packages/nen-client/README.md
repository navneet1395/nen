# Nen Client SDK (`@withnen/client`)

The browser/frontend SDK for Nen — a drop-in `fetch` replacement that encrypts
the payload before it leaves the tab, using a post-quantum (ML-KEM-768) handshake.

## Install

```bash
npm install @withnen/client
```

## Quick use

```ts
import { createNenFetch, createNenStream } from '@withnen/client';

const nenFetch = createNenFetch('');            // '' = same-origin
const data = await nenFetch('/api/secure', {    // returns the decrypted JSON
  method: 'POST',
  body: JSON.stringify({ ssn: '412-55-9087' }),
});

for await (const chunk of createNenStream('')('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ prompt }),
})) {
  process.stdout.write(chunk);                  // decrypted SSE tokens
}
```

Prefer an explicit instance? `new NenClient(serverUrl, { identityMode: 'pqc' })`
then `await client.handshake()`, `client.nenFetch()`, `client.nenStream()`,
`client.rotate()`, `client.terminate()`, `client.status()`.

## What it does

1. **Handshake** — generates an ML-KEM keypair in Wasm, posts the public key,
   decapsulates the returned ciphertext into the shared secret, and stores the
   server-issued HMAC key. With `identityMode: 'pqc'` it also signs the ephemeral
   key with ML-DSA. The ML-KEM secret key is zeroized immediately after.
2. **`nenFetch`** — encrypts the JSON body (ChaCha20-Poly1305), sends
   `{ ct, n }` base64 with the `X-Nen-Session`, `X-Nen-Timestamp`, and
   `X-Nen-Signature` (HMAC) headers, and decrypts the JSON response.
3. **`nenStream`** — same request leg; yields decrypted SSE chunks as an async
   generator.
4. **Auto-recovery** — on a `401` it transparently `rotate()`s (fresh handshake)
   and retries once.

## Coded errors

Failures throw an `NenError` carrying a stable `ISO-xxxx` code (e.g.
`ISO-2001` SESSION_NOT_INITIALIZED, `ISO-1003` HANDSHAKE_NETWORK). The wire/throw
surface never leaks the internal diagnostic hint. Resolve a code with
`describeNenCode('ISO-1003')`. Full catalog: [`../../ERROR_CODES.md`](../../ERROR_CODES.md).

## Build & test

```bash
npm run build   # tsup → dist/ (CJS + ESM + .d.ts)
npm test        # jest (core-crypto mapped to the Node wasm build for tests)
```

## Notes

- Session keys live in instance memory only — never `localStorage`/cookies — and
  are lost on refresh (a fresh handshake follows). Each tab handshakes independently.
- The wire format is base64-only (`{ ct, n }`) as of **v0.2.0**.

See [`../../PROTOCOL.md`](../../PROTOCOL.md) for the exact protocol.
