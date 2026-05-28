import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    const includeBar = false;
    expect(cn('foo', includeBar && 'bar', 'baz')).toBe('foo baz');
  });

  it('merges tailwind conflicts', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});
