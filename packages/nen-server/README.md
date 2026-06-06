# Nen Server SDK (`@nen/server`)

The Next.js / serverless middleware for Nen. It runs the handshake, manages
session keys, verifies the per-request HMAC, and decrypts/encrypts payloads.

## Install

```bash
npm install @nen/server
```

## Setup

Mount the session routes (`src/app/api/nen/[action]/route.ts`):

```typescript
import {
  handleHandshake, handleRotate, handleTerminate, handleStatus,
  setSessionStore, InMemorySessionStore,
} from '@nen/server';

setSessionStore(new InMemorySessionStore()); // see "Session stores" below

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (action === 'handshake') return handleHandshake(req);
  if (action === 'rotate')    return handleRotate(req);
  if (action === 'terminate') return handleTerminate(req);
  return new Response('Not Found', { status: 404 });
}
export async function GET(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  return action === 'status' ? handleStatus(req) : new Response('Not Found', { status: 404 });
}
```

Protect any endpoint:

```typescript
import { withNen } from '@nen/server';
export const POST = withNen(async (req, body) => {
  // body is already decrypted AND the request is already authenticated
  return { ok: true, body };
});
```

Stream (SSE): `withNenStream(async (req, body) => asyncGeneratorOfChunks)`.

## How it works

- **`store.ts`** — the `SessionStore` interface plus `InMemorySessionStore`
  (bound to `globalThis` so Next.js HMR doesn't wipe keys in dev). Stores
  `{ sharedSecret, hmacKey }` per `sessionId` and tracks nonces.
- **`middleware.ts`** — `handleHandshake` (ML-KEM encapsulate + issue a random
  HMAC key + optional ML-DSA identity check), `decryptPayload`, `encryptPayload`,
  and the lifecycle handlers.
- **`wrapper.ts` / `stream-wrapper.ts`** — the `withNen` / `withNenStream`
  DX wrappers.

## Mandatory per-request HMAC

HMAC is **required by default**. `decryptPayload`/`withNen` reject any request
that lacks a valid `X-Nen-Signature` + in-window timestamp with
[`ISO-3001`](../../ERROR_CODES.md). Pass `withNen(handler, { strict: false })`
only for explicitly opted-in legacy clients that cannot sign.

## Session stores

```typescript
import { RedisSessionStore, UpstashSessionStore } from '@nen/server';

// Any node/serverless runtime (ioredis, node-redis, or @upstash/redis client):
setSessionStore(new RedisSessionStore(redisClient));

// Edge runtimes (Workers, Vercel Edge) — Upstash REST over fetch, no TCP:
setSessionStore(new UpstashSessionStore(
  process.env.UPSTASH_REDIS_REST_URL!,
  process.env.UPSTASH_REDIS_REST_TOKEN!,
));
```

## Coded errors

Every failure is an `NenError` with a stable `ISO-xxxx` code. The wire body is
`{ error: { code, message } }` (safe message only); the precise diagnosis is logged
server-side. Resolve a code with `describeNenCode(...)`. Catalog:
[`../../ERROR_CODES.md`](../../ERROR_CODES.md).

## Build & test

```bash
npm run build   # tsup → dist/ (CJS + ESM + .d.ts)
npm test        # 19 tests: handshake, HMAC-mandatory, replay, AEAD tamper, identity, Upstash
```

The wire format is base64-only (`{ ct, n }`) as of **v0.2.0**. See
[`../../PROTOCOL.md`](../../PROTOCOL.md).
