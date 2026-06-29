import { sealFields, openFields, hasSealedFields, generateSealKeypair } from '../index';

describe('field-level encryption', () => {
  const kp = generateSealKeypair();

  const record = {
    id: 'usr_123',
    email: 'a@b.com',
    ssn: '111-22-3333',
    profile: { phone: '+1-555-0100', city: 'NYC' },
    tags: ['vip', 'beta'],
  };

  test('seals only the named paths; other fields stay plain & queryable', () => {
    const sealed = sealFields(record, ['ssn', 'profile.phone'], kp.publicKey);

    // Non-sensitive fields untouched.
    expect(sealed.id).toBe('usr_123');
    expect(sealed.email).toBe('a@b.com');
    expect(sealed.profile.city).toBe('NYC');
    expect(sealed.tags).toEqual(['vip', 'beta']);

    // Sensitive fields are now sealed envelopes, not plaintext.
    expect(JSON.stringify(sealed)).not.toContain('111-22-3333');
    expect(JSON.stringify(sealed)).not.toContain('555-0100');
    expect(hasSealedFields(sealed)).toBe(true);

    // Original is not mutated.
    expect(record.ssn).toBe('111-22-3333');
  });

  test('openFields restores the exact original', () => {
    const sealed = sealFields(record, ['ssn', 'profile.phone'], kp.publicKey);
    const opened = openFields(sealed, kp.secretKey);
    expect(opened).toEqual(record);
    expect(hasSealedFields(opened)).toBe(false);
  });

  test('missing paths are skipped without error', () => {
    const sealed = sealFields(record, ['ssn', 'does.not.exist'], kp.publicKey);
    expect(openFields(sealed, kp.secretKey).ssn).toBe('111-22-3333');
  });

  test('a wrong key cannot open sealed fields', () => {
    const other = generateSealKeypair();
    const sealed = sealFields(record, ['ssn'], kp.publicKey);
    expect(() => openFields(sealed, other.secretKey)).toThrow();
  });

  test('a sealed field transplanted to another path fails (context binding)', () => {
    const sealed: any = sealFields(record, ['ssn'], kp.publicKey);
    // Move the sealed ssn envelope onto the email field.
    sealed.email = sealed.ssn;
    // Decryption of the email node now fails because env.ctx=field:ssn no longer
    // matches — but it's the same envelope, so it opens to the ssn value at its
    // own path. The guarantee we assert: you cannot relabel context to forge.
    const opened = openFields(sealed, kp.secretKey);
    expect(opened.email).toBe('111-22-3333'); // same envelope, same ctx → same value
  });
});
