import { withNenStream } from '@withnen/server';
import type { ChatMessage, SecureChatParams } from './types';

export type { ChatMessage, SecureChatParams };

/**
 * A function you supply that calls the model provider and yields response text
 * chunks. It receives the DECRYPTED request body. This is where the provider
 * (OpenAI, Anthropic, …) necessarily sees plaintext to run inference.
 */
export type SecureAIProvider = (
  body: SecureChatParams,
  req: Request
) => AsyncIterable<string> | Promise<AsyncIterable<string>>;

/**
 * Server-side handler for `@withnen/ai`. Wraps `withNenStream`: it decrypts
 * the incoming prompt, hands it to your `provider`, and streams the provider's
 * text chunks back to the browser ENCRYPTED, chunk by chunk.
 *
 * Nen secures the transport between the browser and this handler. Inside the
 * handler you call the model provider with plaintext — by necessity.
 *
 * @example
 *   // app/api/ai/chat/route.ts
 *   import { withSecureAI } from '@withnen/ai/server';
 *   import OpenAI from 'openai';
 *   const openai = new OpenAI();
 *
 *   export const POST = withSecureAI(async function* (body) {
 *     const stream = await openai.chat.completions.create({
 *       model: body.model ?? 'gpt-4o-mini',
 *       messages: body.messages,
 *       stream: true,
 *     });
 *     for await (const chunk of stream) {
 *       const delta = chunk.choices[0]?.delta?.content;
 *       if (delta) yield delta;
 *     }
 *   });
 */
export function withSecureAI(provider: SecureAIProvider) {
  return withNenStream(async (req, body) => {
    return provider(body as SecureChatParams, req);
  });
}
