import { describe, expect, it } from 'vitest';
import { leaveDatesFromDayNumbers, parseLeaveDateLabel } from './hr-leave-date-parse';
import { formatHrDateKey } from './hr-schedule-datetime';

describe('parseLeaveDateLabel', () => {
  it('parses day ranges in month context', () => {
    const r = parseLeaveDateLabel('19-21', 2026, 5);
    expect(r.holidayDayNumbers).toEqual([19, 20, 21]);
  });

  it('parses comma-separated days', () => {
    const r = parseLeaveDateLabel('5,6,7', 2026, 3);
    expect(r.holidayDayNumbers).toEqual([5, 6, 7]);
  });

  it('detects táppénz without day list', () => {
    const r = parseLeaveDateLabel('táppénz', 2026, 4);
    expect(r.sickPayOnly).toBe(true);
    expect(r.holidayDayNumbers).toEqual([]);
  });

  it('parses dotted day pairs', () => {
    const r = parseLeaveDateLabel('21.22', 2026, 1);
    expect(r.holidayDayNumbers).toEqual([21, 22]);
  });

  it('builds dates from day numbers', () => {
    const dates = leaveDatesFromDayNumbers(2026, 5, [19, 20]);
    expect(dates).toHaveLength(2);
    expect(formatHrDateKey(dates[0]!)).toBe('2026-05-19');
  });
});
