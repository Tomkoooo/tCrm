import { describe, expect, it } from 'vitest';
import { rangesOverlap, isValidObjectId } from './availability';

describe('rangesOverlap', () => {
  it('detects overlapping ranges', () => {
    expect(
      rangesOverlap(
        new Date('2026-08-10T08:00:00Z'),
        new Date('2026-08-10T12:00:00Z'),
        new Date('2026-08-10T10:00:00Z'),
        new Date('2026-08-10T14:00:00Z')
      )
    ).toBe(true);
  });

  it('returns false for adjacent ranges', () => {
    expect(
      rangesOverlap(
        new Date('2026-08-10T08:00:00Z'),
        new Date('2026-08-10T12:00:00Z'),
        new Date('2026-08-10T12:00:00Z'),
        new Date('2026-08-10T14:00:00Z')
      )
    ).toBe(false);
  });

  it('returns false for fully separate ranges', () => {
    expect(
      rangesOverlap(
        new Date('2026-08-10T08:00:00Z'),
        new Date('2026-08-10T10:00:00Z'),
        new Date('2026-08-10T12:00:00Z'),
        new Date('2026-08-10T14:00:00Z')
      )
    ).toBe(false);
  });
});

describe('isValidObjectId', () => {
  it('accepts 24-hex ids', () => {
    expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
  });

  it('rejects garbage', () => {
    expect(isValidObjectId('not-an-id')).toBe(false);
  });
});
