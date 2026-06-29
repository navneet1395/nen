# @withnen/seal

Session-less, **post-quantum public-key envelope encryption** for [Nen](https://withnen.com).

Where `@withnen/client` + `@withnen/server` protect a live request/response
**session**, `@withnen/seal` protects **data at rest and in flight without a
session**: seal a payload to a recipient's ML-KEM-768 public key, and only the
holder of the secret key can open it. Nothing secret ever crosses the wire.

It's the shared primitive behind four capabilities:

| Capability | Use it for |
| :- | :- |
| **Envelope seal/open** | encrypt anything to a public key |
| **Field-level encryption** | encrypt PII fields *before* they hit logs/DB |
| **Encrypted webhooks** | seal + sign webhook bodies between services |
| **Sealed forms & uploads** | browser-encrypt files/images before upload |

> **What it protects:** everything *between* the two endpoints — storage, CDN,
> logs, queues, proxies, third-party hops — stays ciphertext, and ML-KEM-768
> defends against *harvest-now-decrypt-later*. **What it doesn't:** the endpoints
> hold plaintext by design. This is confidentiality through your pipeline, not
> DRM. See [THREAT_MODEL.md](../../THREAT_MODEL.md).

## Install

```bash
npm install @withnen/seal
```

## Envelope seal / open

```ts
import { generateSealKeypair, seal, open, sealJSON, openJSON } from '@withnen/seal';

const recipient = generateSealKeypair();          // { publicKey, secretKey }

const env = sealJSON(recipient.publicKey, { amount: 4200 });
// env is base64-only: { v, kem, n, ct } — safe to store or send in the clear.

const data = openJSON(recipient.secretKey, env);  // { amount: 4200 }
```

Bind an envelope to a purpose with `context` (domain separation — it can't be
opened under a different context):

```ts
seal(pk, bytes, { context: 'invoice:2026-06' });
```

## Field-level encryption (encrypt-before-log / before-DB)

```ts
import { sealFields, openFields } from '@withnen/seal';

const safe = sealFields(user, ['ssn', 'profile.phone'], recipient.publicKey);
// `safe` keeps id/email/etc. in the clear (still queryable); ssn & phone are
// sealed envelopes. Store/log/queue it freely.

const full = openFields(safe, recipient.secretKey);   // original object back
```

## Encrypted webhooks

```ts
import { sealWebhook, openWebhook, generateSigningKeypair } from '@withnen/seal';

// Sender (signs with its ML-DSA key; receiver publishes its ML-KEM key)
const { headers, body } = sealWebhook(receiverPk, 'payment.succeeded', payload, senderSigningKeys);
await fetch(url, { method: 'POST', headers, body });

// Receiver (pins the sender, checks the event)
const { event, payload } = openWebhook(receiverSk, rawBody, {
  signerPublicKey: senderPk,
  expectedEvent: 'payment.succeeded',
});
```

## Sealed forms & uploads (browser)

```ts
import { sealBlob, openBlob, openObjectURL } from '@withnen/seal';

// In the browser — encrypt before it ever leaves the page:
const sealed = await sealBlob(serverPublicKey, file);   // File/Blob -> SealedMedia
await fetch('/upload', { method: 'POST', body: JSON.stringify(sealed) });

// Anywhere with the secret key — rebuild it:
const blob = openBlob(serverSecretKey, sealed);
const url  = openObjectURL(serverSecretKey, sealed);    // for <img>/<video src>
```

Large files are split into independent AEAD frames (`sealFramed`/`openFramed`)
so a single KEM operation covers the whole object.

## API

- **Envelopes:** `seal`, `open`, `sealString`/`openString`, `sealJSON`/`openJSON`
- **Signed:** `sealSigned`, `openSigned`
- **Framed (large):** `sealFramed`, `openFramed`
- **Fields:** `sealFields`, `openFields`, `hasSealedFields`
- **Webhooks:** `sealWebhook`, `openWebhook`
- **Media/uploads:** `sealMediaBytes`/`openMediaBytes`, `sealBlob`/`openBlob`, `openObjectURL`
- **Keys:** `generateSealKeypair` (ML-KEM-768), `generateSigningKeypair` (ML-DSA-65)

MIT licensed. Part of the Nen monorepo.
