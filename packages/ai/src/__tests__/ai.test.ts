import { createSecureOpenAI, createSecureAnthropic } from '../client';

/**
 * A fake IsogenyClient that records calls and replays canned stream/fetch
 * results — lets us test the @isogeny/ai ergonomics without real crypto or a
 * network. Cast to `any` at the call site since it only implements the surface
 * the AI wrappers touch.
 */
function makeFakeClient(opts: {
  alreadyConnected?: boolean;
  streamChunks?: string[];
  fetchResult?: unknown;
}) {
  const calls = { handshakes: 0, stream: [] as any[], fetch: [] as any[] };
  return {
    calls,
    sessionId: opts.alreadyConnected ? 'sid-123' : null as string | null,
    async handshake() {
      calls.handshakes++;
      this.sessionId = 'sid-123';
    },
    async *pqcstream(endpoint: string, options: any) {
      calls.stream.push({ endpoint, options });
      for (const c of opts.streamChunks ?? []) yield c;
    },
    async pqcfetch(endpoint: string, options: any) {
      calls.fetch.push({ endpoint, options });
      return opts.fetchResult;
    },
  };
}

describe('createSecureOpenAI', () => {
  const messages = [{ role: 'user' as const, content: 'hello' }];

  test('streams decrypted text deltas in order', async () => {
    const fake = makeFakeClient({ alreadyConnected: true, streamChunks: ['He', 'llo', '!'] });
    const ai = createSecureOpenAI({ baseUrl: 'https://app.example.com', client: fake as any });

    const out: string[] = [];
    for await (const delta of ai.chat.completions.stream({ messages })) {
      out.push(delta);
    }
    expect(out).toEqual(['He', 'llo', '!']);
  });

  test('performs a handshake first when not yet connected', async () => {
    const fake = makeFakeClient({ alreadyConnected: false, streamChunks: ['x'] });
    const ai = createSecureOpenAI({ baseUrl: 'https://app.example.com', client: fake as any });

    // consume the generator
    for await (const _ of ai.chat.completions.stream({ messages })) { /* drain */ }
    expect(fake.calls.handshakes).toBe(1);
  });

  test('sends the prompt to the configured endpoint as the request body', async () => {
    const fake = makeFakeClient({ alreadyConnected: true, streamChunks: [] });
    const ai = createSecureOpenAI({
      baseUrl: 'https://app.example.com',
      endpoint: '/api/custom-chat',
      client: fake as any,
    });

    for await (const _ of ai.chat.completions.stream({ messages, model: 'gpt-4o-mini' })) { /* drain */ }

    expect(fake.calls.stream).toHaveLength(1);
    expect(fake.calls.stream[0].endpoint).toBe('/api/custom-chat');
    expect(fake.calls.stream[0].options.method).toBe('POST');
    expect(JSON.parse(fake.calls.stream[0].options.body)).toEqual({
      messages,
      model: 'gpt-4o-mini',
    });
  });

  test('create() returns the decrypted JSON from pqcfetch', async () => {
    const fake = makeFakeClient({ alreadyConnected: true, fetchResult: { content: 'hi' } });
    const ai = createSecureOpenAI({ baseUrl: 'https://app.example.com', client: fake as any });

    const res = await ai.chat.completions.create({ messages });
    expect(res).toEqual({ content: 'hi' });
    expect(fake.calls.fetch[0].endpoint).toBe('/api/ai/chat');
  });
});

describe('createSecureAnthropic', () => {
  test('streams via the default /api/ai/messages endpoint', async () => {
    const fake = makeFakeClient({ alreadyConnected: true, streamChunks: ['a', 'b'] });
    const ai = createSecureAnthropic({ baseUrl: 'https://app.example.com', client: fake as any });

    const out: string[] = [];
    for await (const delta of ai.messages.stream({ messages: [{ role: 'user', content: 'hi' }] })) {
      out.push(delta);
    }
    expect(out).toEqual(['a', 'b']);
    expect(fake.calls.stream[0].endpoint).toBe('/api/ai/messages');
  });
});
