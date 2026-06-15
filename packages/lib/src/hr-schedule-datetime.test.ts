import { describe, expect, it } from 'vitest';
import {
  combineHrDayAndTime,
  formatHrTime,
  parseHrDateOnly,
  parseHrDateTime,
} from './hr-schedule-datetime';

describe('hr-schedule-datetime', () => {
  it('parseHrDateTime maps 09:00 Budapest to correct UTC in summer (CEST)', () => {
    const d = parseHrDateTime('2026-06-15T09:00:00');
    expect(d.toISOString()).toBe('2026-06-15T07:00:00.000Z');
    expect(formatHrTime(d)).toBe('09:00');
  });

  it('parseHrDateTime maps 09:00 Budapest in winter (CET)', () => {
    const d = parseHrDateTime('2026-01-15T09:00:00');
    expect(d.toISOString()).toBe('2026-01-15T08:00:00.000Z');
    expect(formatHrTime(d)).toBe('09:00');
  });

  it('parseHrDateOnly avoids UTC date-only drift', () => {
    const d = parseHrDateOnly('2026-06-01');
    expect(formatHrTime(d)).toBe('00:00');
  });

  it('combineHrDayAndTime applies shift wall clock', () => {
    const day = parseHrDateOnly('2026-06-15');
    const start = combineHrDayAndTime(day, '09:00');
    const end = combineHrDayAndTime(day, '17:00');
    expect(formatHrTime(start)).toBe('09:00');
    expect(formatHrTime(end)).toBe('17:00');
  });
});
