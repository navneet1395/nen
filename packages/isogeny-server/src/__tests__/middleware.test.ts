import { storeSession, getSession } from '../store';
import { handleHandshake, encryptPayload, decryptPayload } from '../middleware';

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
    const dummySecret = new Uint8Array([1, 2, 3, 4]);
    storeSession('session-1', dummySecret);
    
    const retrieved = getSession('session-1');
    expect(retrieved).toEqual(dummySecret);
  });

  test('getSession with invalid ID returns null', () => {
    const retrieved = getSession('invalid-id');
    expect(retrieved).toBeNull();
  });

  test('decryptPayload with invalid session throws error', () => {
    expect(() => {
      decryptPayload('fake-session', { ciphertext: [], nonce: [] });
    }).toThrow('Invalid or expired session');
  });

  test('encryptPayload with invalid session throws error', () => {
    expect(() => {
      encryptPayload('fake-session', new Uint8Array([1]));
    }).toThrow('Invalid or expired session');
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
    expect(body.error).toBe('Invalid publicKey format');
  });
});
