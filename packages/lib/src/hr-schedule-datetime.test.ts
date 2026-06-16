import { describe, expect, it } from 'vitest';
import {
  combineHrDayAndTime,
  formatHrDateTimeLocal,
  formatHrTime,
  formatScheduleChangeSummary,
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

  it('formatHrDateTimeLocal round-trips for datetime-local inputs', () => {
    const d = parseHrDateTime('2026-06-15T09:30:00');
    expect(formatHrDateTimeLocal(d)).toBe('2026-06-15T09:30');
  });

  it('formatScheduleChangeSummary shows from → to', () => {
    const fromStart = parseHrDateTime('2026-06-15T08:00:00');
    const fromEnd = parseHrDateTime('2026-06-15T16:00:00');
    const toStart = parseHrDateTime('2026-06-15T10:00:00');
    const toEnd = parseHrDateTime('2026-06-15T18:00:00');
    const summary = formatScheduleChangeSummary(fromStart, fromEnd, toStart, toEnd);
    expect(summary).toContain('→');
    expect(summary).toContain('08:00');
    expect(summary).toContain('18:00');
  });
});
