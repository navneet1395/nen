import { NenClient } from '@withnen/client';
import type { ChatMessage, SecureChatParams } from './types';

export type { ChatMessage, SecureChatParams };

export interface SecureAIClientOptions {
  /**
   * Origin of YOUR backend — the server that terminates Nen, decrypts the
   * prompt, and calls the model provider. Prompts are ciphertext from the
   * browser to here.
   */
  baseUrl: string;
  /** Path of the secure chat route on your backend. */
  endpoint?: string;
  /** Reuse an existing NenClient (e.g. one shared across your app). */
  client?: NenClient;
}

async function ensureConnected(client: NenClient): Promise<void> {
  if (!client.sessionId) {
    await client.handshake();
  }
}

/**
 * Create an OpenAI-shaped client whose chat calls are end-to-end encrypted from
 * the browser to YOUR backend.
 *
 * IMPORTANT — what this protects (and what it does not):
 *   - Protected: the prompt and the streamed response are ciphertext across your
 *     own infrastructure and any intermediary (CDN, edge, load balancer, logs,
 *     proxies) between the browser and your backend.
 *   - NOT protected: hiding the prompt from the model provider. The provider must
 *     see plaintext to run inference. Your backend decrypts and forwards the
 *     plaintext to the provider. To also hide from the provider you must
 *     self-host the model or use a confidential-compute TEE — out of scope here.
 *
 * @example
 *   const ai = createSecureOpenAI({ baseUrl: 'https://app.example.com' });
 *   for await (const delta of ai.chat.completions.stream({ messages })) {
 *     process.stdout.write(delta);
 *   }
 */
export function createSecureOpenAI(options: SecureAIClientOptions) {
  const endpoint = options.endpoint ?? '/api/ai/chat';
  const client = options.client ?? new NenClient(options.baseUrl);

  return {
    chat: {
      completions: {
        /** Streamed encrypted completion. Yields response text deltas. */
        async *stream(params: SecureChatParams): AsyncGenerator<string> {
          await ensureConnected(client);
          yield* client.nenStream(endpoint, {
            method: 'POST',
            body: JSON.stringify(params),
          });
        },

        /** Non-streamed encrypted completion; resolves the decrypted JSON. */
        async create(params: SecureChatParams): Promise<any> {
          await ensureConnected(client);
          return client.nenFetch(endpoint, {
            method: 'POST',
            body: JSON.stringify(params),
          });
        },
      },
    },
  };
}

/**
 * Anthropic-shaped convenience over the same encrypted transport. Defaults to a
 * `/api/ai/messages` route on your backend.
 */
export function createSecureAnthropic(options: SecureAIClientOptions) {
  const endpoint = options.endpoint ?? '/api/ai/messages';
  const client = options.client ?? new NenClient(options.baseUrl);

  return {
    messages: {
      async *stream(params: SecureChatParams): AsyncGenerator<string> {
        await ensureConnected(client);
        yield* client.nenStream(endpoint, {
          method: 'POST',
          body: JSON.stringify(params),
        });
      },
      async create(params: SecureChatParams): Promise<any> {
        await ensureConnected(client);
        return client.nenFetch(endpoint, {
          method: 'POST',
          body: JSON.stringify(params),
        });
      },
    },
  };
}
