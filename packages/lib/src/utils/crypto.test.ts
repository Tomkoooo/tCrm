import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret } from './crypto';

describe('encryptSecret / decryptSecret', () => {
  const prev = process.env.SECRETS_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.SECRETS_ENCRYPTION_KEY = 'test-master-secret-at-least-32-chars!!';
  });

  afterEach(() => {
    if (prev === undefined) {
      delete process.env.SECRETS_ENCRYPTION_KEY;
    } else {
      process.env.SECRETS_ENCRYPTION_KEY = prev;
    }
  });

  it('round-trips plaintext', () => {
    const plain = 'sk-live-abc123_very-secret';
    const enc = encryptSecret(plain);
    expect(enc.split(':')).toHaveLength(4);
    expect(decryptSecret(enc)).toBe(plain);
  });

  it('produces different ciphertext for same plaintext', () => {
    const a = encryptSecret('same');
    const b = encryptSecret('same');
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe('same');
    expect(decryptSecret(b)).toBe('same');
  });
});
