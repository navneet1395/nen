import { UpstashSessionStore } from '../store/upstash';

/**
 * Contract tests for the edge REST store. We stub global fetch with a tiny
 * in-memory Redis so we can assert the store speaks the right REST commands and
 * round-trips a session (the keys are base64 strings, like real handshakes).
 */
function mockUpstash() {
  const kv = new Map<string, string>();
  const sets = new Map<string, Set<string>>();
  const calls: string[][] = [];

  const fetchMock = jest.fn(async (_url: string, init: any) => {
    const command: (string | number)[] = JSON.parse(init.body);
    calls.push(command.map(String));
    const [op, key, ...rest] = command as [string, string, ...any[]];
    let result: unknown = null;

    switch (op) {
      case 'SET':
        kv.set(key, String(rest[0]));
        result = 'OK';
        break;
      case 'GET':
        result = kv.has(key) ? kv.get(key) : null;
        break;
      case 'DEL':
        result = kv.delete(key) ? 1 : 0;
        break;
      case 'EXISTS':
        result = kv.has(key) ? 1 : 0;
        break;
      case 'SADD': {
        const s = sets.get(key) ?? new Set<string>();
        const added = s.has(String(rest[0])) ? 0 : 1;
        s.add(String(rest[0]));
        sets.set(key, s);
        result = added;
        break;
      }
      case 'SISMEMBER':
        result = sets.get(key)?.has(String(rest[0])) ? 1 : 0;
        break;
      case 'EXPIRE':
        result = 1;
        break;
    }

    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ result }),
    } as any;
  });

  return { fetchMock, calls };
}

describe('UpstashSessionStore (REST contract)', () => {
  const sid = 'sess-1';
  const encKey = new Uint8Array(32).fill(2);
  const macKey = new Uint8Array(32).fill(4);

  test('round-trips a session and tracks nonces over REST', async () => {
    const { fetchMock, calls } = mockUpstash();
    global.fetch = fetchMock as any;

    const store = new UpstashSessionStore('https://example.upstash.io', 'token', 'nen:session:', 60);

    expect(await store.exists(sid)).toBe(false);
    expect(await store.get(sid)).toBeNull();

    await store.set(sid, encKey, macKey);
    expect(await store.exists(sid)).toBe(true);

    const got = await store.get(sid);
    expect(got).not.toBeNull();
    expect(Array.from(got!.encKey)).toEqual(Array.from(encKey));
    expect(Array.from(got!.macKey)).toEqual(Array.from(macKey));

    expect(await store.hasNonce(sid, 'nonceA')).toBe(false);
    await store.trackNonce(sid, 'nonceA');
    expect(await store.hasNonce(sid, 'nonceA')).toBe(true);

    expect(await store.delete(sid)).toBe(true);
    expect(await store.exists(sid)).toBe(false);

    // SET carried an EX ttl, and the Authorization header was sent.
    const setCall = calls.find((c) => c[0] === 'SET');
    expect(setCall).toEqual(expect.arrayContaining(['SET', 'EX', '60']));
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.upstash.io',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
      }),
    );
  });

  test('throws on a non-ok REST response', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 500, statusText: 'Server Error' })) as any;
    const store = new UpstashSessionStore('https://example.upstash.io', 'token');
    await expect(store.get('x')).rejects.toThrow(/Upstash REST request failed: 500/);
  });
});
