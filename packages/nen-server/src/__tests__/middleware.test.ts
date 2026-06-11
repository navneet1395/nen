import { storeSession, getSession } from '../store';
import { handleHandshake, encryptPayload, verifyRequest } from '../middleware';

// Mock Web Crypto for Node environment
if (!globalThis.crypto) {
  const crypto = require('crypto');
  globalThis.crypto = {
    randomUUID: () => crypto.randomUUID()
  } as any;
}

describe('Server Middleware Edge Cases', () => {
  beforeEach(() => {
    // We would clear the session map here but it's not exported
  });

  test('storeSession and getSession lifecycle', () => {
    const encKey = new Uint8Array([1, 2, 3, 4]);
    const macKey = new Uint8Array([5, 6, 7, 8]);
    storeSession('session-1', encKey, macKey);

    const retrieved = getSession('session-1');
    expect(retrieved).toEqual({ encKey, macKey });
  });

  test('getSession with invalid ID returns null', () => {
    const retrieved = getSession('invalid-id');
    expect(retrieved).toBeNull();
  });

  test('verifyRequest with invalid session throws error', async () => {
    // ISO-2002 SESSION_INVALID_OR_EXPIRED — session lookup runs first.
    await expect(
      verifyRequest('fake-session', 'AAAA', undefined)
    ).rejects.toMatchObject({ code: 'ISO-2002' });
  });

  test('encryptPayload with invalid session throws error', async () => {
    await expect(
      encryptPayload('fake-session', new Uint8Array([1]))
    ).rejects.toMatchObject({ code: 'ISO-2002' });
  });

  test('handleHandshake gracefully fails on missing body', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: 'invalid-json'
    });
    
    const response = await handleHandshake(req);
    expect(response.status).toBe(500);
  });

  test('handleHandshake gracefully fails on missing public key', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wrongField: [] })
    });
    
    const response = await handleHandshake(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    // ISO-1001 HANDSHAKE_MISSING_PUBLIC_KEY — coded body { error: { code, message } }.
    expect(body.error.code).toBe('ISO-1001');
  });
});
