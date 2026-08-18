import { describe, expect, it } from 'vitest';
import { overlapHours } from './hours';

describe('overlapHours', () => {
  const monthStart = new Date('2026-08-01T00:00:00.000Z');
  const monthEnd = new Date('2026-09-01T00:00:00.000Z');

  it('counts full entry inside month', () => {
    const start = new Date('2026-08-10T08:00:00.000Z');
    const end = new Date('2026-08-10T12:00:00.000Z');
    expect(overlapHours(start, end, monthStart, monthEnd)).toBe(4);
  });

  it('clips entry that spans month boundary', () => {
    const start = new Date('2026-07-31T22:00:00.000Z');
    const end = new Date('2026-08-01T02:00:00.000Z');
    expect(overlapHours(start, end, monthStart, monthEnd)).toBe(2);
  });

  it('returns 0 when no overlap', () => {
    const start = new Date('2026-09-01T08:00:00.000Z');
    const end = new Date('2026-09-01T12:00:00.000Z');
    expect(overlapHours(start, end, monthStart, monthEnd)).toBe(0);
  });
});
