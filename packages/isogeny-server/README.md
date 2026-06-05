# @isogeny/server

The official Next.js server middleware and DX wrapper for Isogeny.

## Installation

```bash
npm install @isogeny/server
```

## Usage

Wrap your standard App Router API routes in `withIsogeny`. The wrapper will automatically decrypt the incoming Post-Quantum ChaCha20 payload, pass it to your handler as a JSON object, and re-encrypt your returned JSON object before sending it to the client.

```typescript
import { withIsogeny } from '@isogeny/server';

export const POST = withIsogeny(async (request: Request, decryptedBody: any) => {
  console.log('Received:', decryptedBody);

  // Return a normal JSON object. The wrapper automatically encrypts it!
  return { success: true, message: "Hello from Isogeny Serverless Middleware!" };
});
```

You must also expose the handshake, status, and terminate endpoints. We recommend placing them in `/api/isogeny/[action]/route.ts`.

```typescript
// Example: src/app/api/isogeny/handshake/route.ts
import { handleHandshake } from '@isogeny/server';
export async function POST(request: Request) {
  return handleHandshake(request);
}
```

## Features
- **Zero-Boilerplate DX:** Focus on business logic, not cryptography.
- **Edge Compatible:** Compiles perfectly for Vercel Edge functions via WebAssembly.
