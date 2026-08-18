import { describe, expect, it } from 'vitest';
import { eachDayInRange, dedupeDates } from '@crm/lib';
import { computeRemainingDays } from './leave-summary';

describe('leave math', () => {
  it('eachDayInRange is inclusive', () => {
    const days = eachDayInRange(new Date(2026, 7, 10), new Date(2026, 7, 12));
    expect(days).toHaveLength(3);
  });

  it('dedupeDates removes same calendar day', () => {
    const a = new Date(2026, 7, 10, 8);
    const b = new Date(2026, 7, 10, 18);
    expect(dedupeDates([a, b])).toHaveLength(1);
  });

  it('computeRemainingDays', () => {
    expect(computeRemainingDays(20, 5)).toBe(15);
    expect(computeRemainingDays(20, 25)).toBe(-5);
  });
});
