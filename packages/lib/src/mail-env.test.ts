import { afterEach, describe, expect, it } from 'vitest';
import { ensurePublicUrlEnv, getAppUrl, isUsablePublicUrl, resolvePublicAppUrl } from './mail-env';

const envBackup = { ...process.env };

afterEach(() => {
  process.env = { ...envBackup };
});

describe('isUsablePublicUrl', () => {
  it('rejects 0.0.0.0', () => {
    expect(isUsablePublicUrl('http://0.0.0.0:3000')).toBe(false);
  });

  it('accepts localhost and public hosts', () => {
    expect(isUsablePublicUrl('http://localhost:3000')).toBe(true);
    expect(isUsablePublicUrl('https://crm.example.com')).toBe(true);
  });
});

describe('resolvePublicAppUrl', () => {
  it('prefers APP_URL over unusable AUTH_URL', () => {
    process.env.APP_URL = 'https://crm.example.com';
    process.env.AUTH_URL = 'http://0.0.0.0:3000';
    expect(resolvePublicAppUrl()).toBe('https://crm.example.com');
  });

  it('falls back when only AUTH_URL is 0.0.0.0', () => {
    delete process.env.APP_URL;
    process.env.AUTH_URL = 'http://0.0.0.0:3000';
    expect(resolvePublicAppUrl()).toBe('http://localhost:3000');
  });

  it('uses usable AUTH_URL when APP_URL is unset', () => {
    delete process.env.APP_URL;
    process.env.AUTH_URL = 'https://auth.example.com';
    expect(getAppUrl()).toBe('https://auth.example.com');
  });
});

describe('ensurePublicUrlEnv', () => {
  it('rewrites bad AUTH_URL to resolved public URL', () => {
    process.env.APP_URL = 'https://crm.example.com';
    process.env.AUTH_URL = 'http://0.0.0.0:3000';
    ensurePublicUrlEnv();
    expect(process.env.AUTH_URL).toBe('https://crm.example.com');
  });
});
