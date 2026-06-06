import { IsogenyClient, IsogenyError, describeIsogenyCode } from '../index';

describe('IsogenyClient coded errors', () => {
  let client: IsogenyClient;

  beforeEach(() => {
    client = new IsogenyClient('http://localhost:3000');
    // Mock global fetch
    global.fetch = jest.fn();
  });

  test('pqcfetch before handshake → ISO-2001 SESSION_NOT_INITIALIZED', async () => {
    await expect(client.pqcfetch('/api/data')).rejects.toMatchObject({
      code: 'ISO-2001',
    });
  });

  test('pqcstream before handshake → ISO-2001 SESSION_NOT_INITIALIZED', async () => {
    const gen = client.pqcstream('/api/data');
    await expect(gen.next()).rejects.toMatchObject({ code: 'ISO-2001' });
  });

  test('handshake network failure → ISO-1003 HANDSHAKE_NETWORK', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network unreachable'));
    await expect(client.handshake()).rejects.toMatchObject({ code: 'ISO-1003' });
  });

  test('handshake 500 response → ISO-1004 HANDSHAKE_BAD_RESPONSE', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });
    await expect(client.handshake()).rejects.toMatchObject({ code: 'ISO-1004' });
  });

  test('thrown errors are IsogenyError instances carrying code + status', async () => {
    try {
      await client.pqcfetch('/api/data');
      throw new Error('expected pqcfetch to throw');
    } catch (e) {
      expect(e).toBeInstanceOf(IsogenyError);
      const err = e as IsogenyError;
      expect(err.code).toBe('ISO-2001');
      expect(err.status).toBe(409);
      // The safe wire body never leaks the internal hint.
      expect(err.toBody()).toEqual({
        error: { code: 'ISO-2001', message: err.message },
      });
      expect(JSON.stringify(err.toBody())).not.toContain(err.hint);
    }
  });
});

describe('describeIsogenyCode reverse lookup', () => {
  test('resolves a known client code from a log/support ticket', () => {
    // ISO-2001 SESSION_NOT_INITIALIZED is in the client catalog (server-only
    // codes like ISO-3001 live in @isogeny/server's mirror).
    const spec = describeIsogenyCode('ISO-2001');
    expect(spec).toBeDefined();
    expect(spec!.status).toBe(409);
  });

  test('returns undefined for an unknown code', () => {
    expect(describeIsogenyCode('ISO-0000')).toBeUndefined();
  });
});
