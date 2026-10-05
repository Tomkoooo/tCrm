import { describe, expect, it } from 'vitest';
import { parseHrDateOnly } from '@crm/lib';
import {
  cellKey,
  eachPlanDayKey,
  formatScheduleCell,
  isValidDayKey,
  isValidShiftTime,
  parseScheduleCell,
} from './schedule-plans';

describe('parseScheduleCell', () => {
  it('reads the roster shorthand from the Excel roster', () => {
    expect(parseScheduleCell('13:00 BOK')).toEqual({
      startTime: '13:00',
      locationLabel: 'BOK',
    });
    expect(parseScheduleCell('8:00 Kispest')).toEqual({
      startTime: '08:00',
      locationLabel: 'Kispest',
    });
    expect(parseScheduleCell('11:30 BOK')).toEqual({
      startTime: '11:30',
      locationLabel: 'BOK',
    });
  });

  it('accepts a time with no location', () => {
    expect(parseScheduleCell('9:00')).toEqual({ startTime: '09:00', locationLabel: undefined });
  });

  it('treats a location-only cell as an all-day shift', () => {
    expect(parseScheduleCell('Remiz')).toEqual({ locationLabel: 'Remiz' });
    expect(parseScheduleCell('Edzés / MDL')).toEqual({ locationLabel: 'Edzés / MDL' });
  });

  it('reads blanks and dashes as "not working"', () => {
    for (const value of ['', '   ', '-', '–', '—']) {
      expect(parseScheduleCell(value)).toBeNull();
    }
  });

  it('falls back to a location when the time is out of range', () => {
    expect(parseScheduleCell('99:99 Nowhere')).toEqual({ locationLabel: '99:99 Nowhere' });
  });

  it('keeps multi-word locations intact', () => {
    expect(parseScheduleCell('6:00 Hősök Tere')).toEqual({
      startTime: '06:00',
      locationLabel: 'Hősök Tere',
    });
  });
});

describe('formatScheduleCell', () => {
  it('round-trips a timed cell back to the shorthand', () => {
    const start = parseHrDateOnly('2026-10-05');
    const at13 = new Date(start.getTime() + 13 * 60 * 60 * 1000);
    expect(formatScheduleCell({ start: at13, locationLabel: 'BOK' })).toBe('13:00 BOK');
  });

  it('labels an all-day cell by its location', () => {
    expect(
      formatScheduleCell({
        start: parseHrDateOnly('2026-10-05'),
        locationLabel: 'Remiz',
        allDay: true,
      })
    ).toBe('Remiz');
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
    // Europe/Budapest leaves DST on 2026-10-25.
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
