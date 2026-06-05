import { IsogenyClient } from '../index';

describe('IsogenyClient Edge Cases', () => {
  let client: IsogenyClient;

  beforeEach(() => {
    client = new IsogenyClient('http://localhost:3000');
    // Mock global fetch
    global.fetch = jest.fn();
  });

  test('pqcfetch throws error if handshake not performed', async () => {
    await expect(client.pqcfetch('/api/data')).rejects.toThrow(
      'IsogenyClient is not connected. Call handshake() first.'
    );
  });

  test('handshake gracefully fails on network error', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network unreachable'));
    
    // We expect handshake to throw a descriptive error or the raw network error
    await expect(client.handshake()).rejects.toThrow('Network unreachable');
  });

  test('handshake gracefully fails on 500 response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error'
    });
    
    await expect(client.handshake()).rejects.toThrow('Handshake failed: Internal Server Error');
  });
});
