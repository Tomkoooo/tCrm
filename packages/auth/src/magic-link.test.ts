import { describe, expect, it } from 'vitest';
import { hashMagicToken, sanitizeMagicRedirect } from './magic-link';

describe('sanitizeMagicRedirect', () => {
  it('keeps in-app relative paths', () => {
    expect(sanitizeMagicRedirect('/hr/me')).toBe('/hr/me');
    expect(sanitizeMagicRedirect('/hr/me/schedule/abc123')).toBe('/hr/me/schedule/abc123');
    expect(sanitizeMagicRedirect('  /hr/schedules  ')).toBe('/hr/schedules');
  });

  it('rejects absolute URLs so the link cannot be turned into an open redirect', () => {
    expect(sanitizeMagicRedirect('https://evil.example/steal')).toBeUndefined();
    expect(sanitizeMagicRedirect('http://evil.example')).toBeUndefined();
    expect(sanitizeMagicRedirect('//evil.example/steal')).toBeUndefined();
  });

  it('rejects anything that is not a rooted path', () => {
    expect(sanitizeMagicRedirect('hr/me')).toBeUndefined();
    expect(sanitizeMagicRedirect('')).toBeUndefined();
    expect(sanitizeMagicRedirect(undefined)).toBeUndefined();
  });

  it('rejects backslash and CRLF smuggling', () => {
    expect(sanitizeMagicRedirect('/\\evil.example')).toBeUndefined();
    expect(sanitizeMagicRedirect('/hr/me\nLocation: https://evil.example')).toBeUndefined();
    expect(sanitizeMagicRedirect('/hr/me\r\nSet-Cookie: x=1')).toBeUndefined();
  });

  it('caps the stored path length', () => {
    expect(sanitizeMagicRedirect(`/${'a'.repeat(900)}`)).toHaveLength(500);
  });
});

describe('hashMagicToken', () => {
  it('is a stable 64-char sha256 hex digest', () => {
    const hash = hashMagicToken('abc');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashMagicToken('abc')).toBe(hash);
  });

  it('ignores surrounding whitespace so a copy-pasted token still matches', () => {
    expect(hashMagicToken('  abc  ')).toBe(hashMagicToken('abc'));
  });

  it('differs for different tokens', () => {
    expect(hashMagicToken('abc')).not.toBe(hashMagicToken('abd'));
  });

  it('never returns the raw token', () => {
    expect(hashMagicToken('supersecret')).not.toContain('supersecret');
  });
});
