# Isogeny Server SDK (`@isogeny/server`)

The Next.js / serverless middleware for Isogeny. It runs the handshake, manages
session keys, verifies the per-request HMAC, and decrypts/encrypts payloads.

## Install

```bash
npm install @isogeny/server
```

## Setup

Mount the session routes (`src/app/api/isogeny/[action]/route.ts`):

```typescript
import {
  handleHandshake, handleRotate, handleTerminate, handleStatus,
  setSessionStore, InMemorySessionStore,
} from '@isogeny/server';

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
import { withIsogeny } from '@isogeny/server';
export const POST = withIsogeny(async (req, body) => {
  // body is already decrypted AND the request is already authenticated
  return { ok: true, body };
});
```

Stream (SSE): `withIsogenyStream(async (req, body) => asyncGeneratorOfChunks)`.

## How it works

- **`store.ts`** — the `SessionStore` interface plus `InMemorySessionStore`
  (bound to `globalThis` so Next.js HMR doesn't wipe keys in dev). Stores
  `{ sharedSecret, hmacKey }` per `sessionId` and tracks nonces.
- **`middleware.ts`** — `handleHandshake` (ML-KEM encapsulate + issue a random
  HMAC key + optional ML-DSA identity check), `decryptPayload`, `encryptPayload`,
  and the lifecycle handlers.
- **`wrapper.ts` / `stream-wrapper.ts`** — the `withIsogeny` / `withIsogenyStream`
  DX wrappers.

## Mandatory per-request HMAC

HMAC is **required by default**. `decryptPayload`/`withIsogeny` reject any request
that lacks a valid `X-Isogeny-Signature` + in-window timestamp with
[`ISO-3001`](../../ERROR_CODES.md). Pass `withIsogeny(handler, { strict: false })`
only for explicitly opted-in legacy clients that cannot sign.

## Session stores

```typescript
import { RedisSessionStore, UpstashSessionStore } from '@isogeny/server';

// Any node/serverless runtime (ioredis, node-redis, or @upstash/redis client):
setSessionStore(new RedisSessionStore(redisClient));

// Edge runtimes (Workers, Vercel Edge) — Upstash REST over fetch, no TCP:
setSessionStore(new UpstashSessionStore(
  process.env.UPSTASH_REDIS_REST_URL!,
  process.env.UPSTASH_REDIS_REST_TOKEN!,
));
```

## Coded errors

Every failure is an `IsogenyError` with a stable `ISO-xxxx` code. The wire body is
`{ error: { code, message } }` (safe message only); the precise diagnosis is logged
server-side. Resolve a code with `describeIsogenyCode(...)`. Catalog:
[`../../ERROR_CODES.md`](../../ERROR_CODES.md).

## Build & test

```bash
npm run build   # tsup → dist/ (CJS + ESM + .d.ts)
npm test        # 19 tests: handshake, HMAC-mandatory, replay, AEAD tamper, identity, Upstash
```

The wire format is base64-only (`{ ct, n }`) as of **v0.2.0**. See
[`../../PROTOCOL.md`](../../PROTOCOL.md).
