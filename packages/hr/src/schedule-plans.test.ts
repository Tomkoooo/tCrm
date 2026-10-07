import { describe, expect, it } from 'vitest';
import { formatHrTime, parseHrDateOnly } from '@crm/lib';
import {
  addHoursToTime,
  cellKey,
  eachPlanDayKey,
  isValidDayKey,
  isValidShiftTime,
  planShiftHours,
  planStartTime,
  resolveCellWindow,
} from './schedule-plans';

describe('addHoursToTime', () => {
  it('adds whole hours', () => {
    expect(addHoursToTime('08:00', 8)).toBe('16:00');
    expect(addHoursToTime('13:00', 8)).toBe('21:00');
  });

  it('adds fractional hours', () => {
    expect(addHoursToTime('08:00', 7.5)).toBe('15:30');
    expect(addHoursToTime('09:15', 0.25)).toBe('09:30');
  });

  it('wraps past midnight', () => {
    expect(addHoursToTime('22:00', 4)).toBe('02:00');
    expect(addHoursToTime('23:30', 1)).toBe('00:30');
  });
});

describe('resolveCellWindow', () => {
  it('resolves a same-day shift', () => {
    const { start, end } = resolveCellWindow('2026-10-06', '13:00', '21:00');
    expect(formatHrTime(start)).toBe('13:00');
    expect(formatHrTime(end)).toBe('21:00');
    expect(end.getTime() - start.getTime()).toBe(8 * 60 * 60 * 1000);
  });

  it('rolls an end that is earlier than the start into the next day', () => {
    const { start, end } = resolveCellWindow('2026-10-06', '22:00', '02:00');
    expect(end.getTime()).toBeGreaterThan(start.getTime());
    expect(end.getTime() - start.getTime()).toBe(4 * 60 * 60 * 1000);
    expect(formatHrTime(end)).toBe('02:00');
  });

  it('treats an end equal to the start as a full 24 hours', () => {
    const { start, end } = resolveCellWindow('2026-10-06', '08:00', '08:00');
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('stays correct across the autumn DST change', () => {
    // 2026-10-25 is the Budapest DST end — that local day is 25 hours long.
    const { start, end } = resolveCellWindow('2026-10-25', '22:00', '02:00');
    expect(formatHrTime(start)).toBe('22:00');
    expect(formatHrTime(end)).toBe('02:00');
    expect(end.getTime()).toBeGreaterThan(start.getTime());
  });
});

describe('plan defaults', () => {
  it('reads the shift length in hours', () => {
    expect(planShiftHours({ defaultShiftHours: 8 })).toBe(8);
    expect(planShiftHours({ defaultShiftHours: 7.5 })).toBe(7.5);
  });

  it('falls back to legacy minutes, converted to hours', () => {
    expect(
      planShiftHours({ defaultShiftHours: undefined as never, defaultShiftMinutes: 480 })
    ).toBe(8);
    expect(
      planShiftHours({ defaultShiftHours: undefined as never, defaultShiftMinutes: 450 })
    ).toBe(7.5);
  });

  it('falls back to 8 hours when nothing usable is stored', () => {
    expect(planShiftHours({ defaultShiftHours: 0 })).toBe(8);
    expect(planShiftHours({ defaultShiftHours: undefined as never })).toBe(8);
  });

  it('validates the stored default start time', () => {
    expect(planStartTime({ defaultStartTime: '06:30' })).toBe('06:30');
    expect(planStartTime({ defaultStartTime: 'nonsense' })).toBe('08:00');
    expect(planStartTime({ defaultStartTime: '' })).toBe('08:00');
  });
});

describe('eachPlanDayKey', () => {
  it('is inclusive of both ends', () => {
    const keys = eachPlanDayKey(parseHrDateOnly('2026-10-05'), parseHrDateOnly('2026-10-11'));
    expect(keys).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
    ]);
  });

  it('returns a single day for a one-day plan', () => {
    expect(eachPlanDayKey(parseHrDateOnly('2026-10-05'), parseHrDateOnly('2026-10-05'))).toEqual([
      '2026-10-05',
    ]);
  });

  it('crosses the DST change without skipping or repeating a day', () => {
    const keys = eachPlanDayKey(parseHrDateOnly('2026-10-23'), parseHrDateOnly('2026-10-27'));
    expect(keys).toEqual(['2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27']);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('crosses the spring DST change too', () => {
    const keys = eachPlanDayKey(parseHrDateOnly('2026-03-27'), parseHrDateOnly('2026-03-31'));
    expect(keys).toEqual(['2026-03-27', '2026-03-28', '2026-03-29', '2026-03-30', '2026-03-31']);
  });

  it('crosses a month and year boundary', () => {
    expect(eachPlanDayKey(parseHrDateOnly('2026-12-30'), parseHrDateOnly('2027-01-02'))).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
    ]);
  });

  it('caps the grid so a mistyped range cannot explode', () => {
    const keys = eachPlanDayKey(parseHrDateOnly('2026-01-01'), parseHrDateOnly('2030-01-01'), 10);
    expect(keys).toHaveLength(10);
  });
});

describe('validators', () => {
  it('accepts well-formed day keys only', () => {
    expect(isValidDayKey('2026-10-05')).toBe(true);
    expect(isValidDayKey('2026-1-5')).toBe(false);
    expect(isValidDayKey('nope')).toBe(false);
  });

  it('accepts 24h times only', () => {
    expect(isValidShiftTime('00:00')).toBe(true);
    expect(isValidShiftTime('23:59')).toBe(true);
    expect(isValidShiftTime('24:00')).toBe(false);
    expect(isValidShiftTime('9:00')).toBe(false);
  });
});

describe('cellKey', () => {
  it('is unique per employee and day', () => {
    expect(cellKey('emp1', '2026-10-05')).toBe('emp1:2026-10-05');
    expect(cellKey('emp1', '2026-10-05')).not.toBe(cellKey('emp2', '2026-10-05'));
  });
});
