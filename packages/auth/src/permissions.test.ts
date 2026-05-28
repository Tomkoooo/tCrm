import { describe, expect, it } from 'vitest';

describe('permission key format', () => {
  it('validates permission key pattern', () => {
    const validKeys = ['admin:access', 'inventory:read', 'users:write'];
    const pattern = /^[a-z]+:[a-z]+$/;
    for (const key of validKeys) {
      expect(key).toMatch(pattern);
    }
  });
});
