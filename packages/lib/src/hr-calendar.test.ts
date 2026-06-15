import { describe, expect, it } from 'vitest';
import { formatDayLabels, isWorkday, splitDayCountByMonth } from './hr-calendar';

describe('hr-calendar', () => {
  it('formatDayLabels groups consecutive days', () => {
    const dates = [
      new Date(2026, 0, 19),
      new Date(2026, 0, 20),
      new Date(2026, 0, 21),
      new Date(2026, 0, 25),
    ];
    expect(formatDayLabels(dates)).toBe('19-21,25');
  });

  it('isWorkday skips weekends', () => {
    expect(isWorkday(new Date(2026, 5, 14))).toBe(false); // Sunday
    expect(isWorkday(new Date(2026, 5, 15))).toBe(true); // Monday
  });

  it('splitDayCountByMonth spans months', () => {
    const splits = splitDayCountByMonth(new Date(2026, 0, 30), new Date(2026, 1, 2));
    expect(splits).toEqual([
      { year: 2026, month: 1, days: 2 },
      { year: 2026, month: 2, days: 2 },
    ]);
  });
});
