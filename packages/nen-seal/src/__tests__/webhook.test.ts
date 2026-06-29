import {
  sealWebhook,
  openWebhook,
  WEBHOOK_EVENT_HEADER,
  generateSealKeypair,
  generateSigningKeypair,
} from '../index';

describe('Nen for Webhooks', () => {
  const receiver = generateSealKeypair(); // receiver publishes receiver.publicKey
  const sender = generateSigningKeypair(); // receiver trusts sender.publicKey

  const payload = { id: 'evt_1', amount: 4200, currency: 'usd' };

  test('round-trips an encrypted, signed webhook', () => {
    const { headers, body } = sealWebhook(receiver.publicKey, 'payment.succeeded', payload, sender);

    expect(headers[WEBHOOK_EVENT_HEADER]).toBe('payment.succeeded');
    expect(headers['content-type']).toBe('application/json');
    expect(body).not.toContain('4200'); // payload is ciphertext

    const opened = openWebhook<typeof payload>(receiver.secretKey, body, {
      signerPublicKey: sender.publicKey,
      expectedEvent: 'payment.succeeded',
    });
    expect(opened.event).toBe('payment.succeeded');
    expect(opened.payload).toEqual(payload);
  });

  test('rejects a body signed by an untrusted sender', () => {
    const attacker = generateSigningKeypair();
    const { body } = sealWebhook(receiver.publicKey, 'payment.succeeded', payload, attacker);
    expect(() =>
      openWebhook(receiver.secretKey, body, { signerPublicKey: sender.publicKey })
    ).toThrow(/signer key/);
  });

  test('rejects an event-type mismatch (replay to a different handler)', () => {
    const { body } = sealWebhook(receiver.publicKey, 'payment.succeeded', payload, sender);
    expect(() =>
      openWebhook(receiver.secretKey, body, {
        signerPublicKey: sender.publicKey,
        expectedEvent: 'payment.refunded',
      })
    ).toThrow(/event mismatch/);
  });

  test('rejects a tampered body', () => {
    const { body } = sealWebhook(receiver.publicKey, 'payment.succeeded', payload, sender);
    const env = JSON.parse(body);
    env.ct = (env.ct[0] === 'A' ? 'B' : 'A') + env.ct.slice(1); // deterministically alter ct
    expect(() =>
      openWebhook(receiver.secretKey, JSON.stringify(env), { signerPublicKey: sender.publicKey })
    ).toThrow(/signature/);
  });
});
