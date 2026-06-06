# @isogeny/ai

End-to-end encrypted AI calls — prompts and streamed responses — for modern web
apps. Powered by Post-Quantum Cryptography (ML-KEM-768 + ChaCha20-Poly1305).

## What this protects (read this first)

`@isogeny/ai` encrypts the prompt and the streamed response **from the user's
browser to your own backend**. Across that path — your CDN, edge, load balancer,
logs, and any proxy — the prompt is ciphertext.

**It does _not_ hide your prompt from the model provider.** OpenAI/Anthropic must
see plaintext to run inference. Your backend decrypts the prompt and forwards it to
the provider. If you also need to hide from the provider, you must self-host the
model or run it in a confidential-compute TEE — that is out of scope for this
package.

```
[ Browser ] ──ciphertext (Isogeny)──▶ [ Your backend ] ──plaintext──▶ [ OpenAI ]
   prompt E2E-encrypted across your own infra      decrypts here       sees plaintext
```

## Install

```bash
npm install @isogeny/ai @isogeny/client @isogeny/server
```

## Client (browser)

```ts
import { createSecureOpenAI } from '@isogeny/ai/client';

const ai = createSecureOpenAI({ baseUrl: 'https://app.example.com' });

for await (const delta of ai.chat.completions.stream({
  messages: [{ role: 'user', content: 'Summarize this contract…' }],
})) {
  process.stdout.write(delta); // decrypted text deltas, as they arrive
}
```

`createSecureAnthropic(...)` is the same over a `/api/ai/messages` route.

## Server (your backend route)

```ts
// app/api/ai/chat/route.ts
import { withSecureAI } from '@isogeny/ai/server';
import OpenAI from 'openai';

const openai = new OpenAI();

export const POST = withSecureAI(async function* (body) {
  // `body` is the DECRYPTED { messages, model, … }. You call the model here.
  const stream = await openai.chat.completions.create({
    model: body.model ?? 'gpt-4o-mini',
    messages: body.messages,
    stream: true,
  });
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta; // streamed back to the browser, encrypted
  }
});
```

You also need the four Isogeny session routes (`/api/isogeny/handshake`,
`/terminate`, `/status`, `/rotate`) wired once — `npx create-isogeny-app` scaffolds
them. See `@isogeny/server`.

## How it works

- Transport is `@isogeny/client`'s `pqcstream` / `pqcfetch` and `@isogeny/server`'s
  `withIsogenyStream` — the same handshake (ML-KEM-768), HMAC-authenticated hot
  path, and chunked AEAD streaming used by the rest of Isogeny.
- See the repo `PROTOCOL.md`, `THREAT_MODEL.md`, and `ERROR_CODES.md`.
