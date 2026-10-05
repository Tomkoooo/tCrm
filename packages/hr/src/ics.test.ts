import { describe, expect, it } from 'vitest';
import { buildIcsCalendar, escapeIcsText, foldIcsLine, formatIcsDate } from './ics';

describe('formatIcsDate', () => {
  it('emits UTC basic format', () => {
    expect(formatIcsDate(new Date('2026-10-05T06:30:00.000Z'))).toBe('20261005T063000Z');
  });

  it('pads single-digit components', () => {
    expect(formatIcsDate(new Date('2026-01-02T03:04:05.000Z'))).toBe('20260102T030405Z');
  });
});

describe('escapeIcsText', () => {
  it('escapes the TEXT value type specials', () => {
    expect(escapeIcsText('a;b,c\\d')).toBe('a\\;b\\,c\\\\d');
  });

  it('turns newlines into literal \\n', () => {
    expect(escapeIcsText('line1\nline2')).toBe('line1\\nline2');
    expect(escapeIcsText('line1\r\nline2')).toBe('line1\\nline2');
  });
});

describe('foldIcsLine', () => {
  it('leaves short lines alone', () => {
    expect(foldIcsLine('SUMMARY:Műszak')).toBe('SUMMARY:Műszak');
  });

  it('folds long lines with a leading space on continuations', () => {
    const folded = foldIcsLine(`DESCRIPTION:${'x'.repeat(200)}`);
    const lines = folded.split('\r\n');
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.slice(1).every((l) => l.startsWith(' '))).toBe(true);
    // Unfolding must reproduce the original.
    expect(lines.map((l, i) => (i === 0 ? l : l.slice(1))).join('')).toBe(
      `DESCRIPTION:${'x'.repeat(200)}`
    );
  });

  it('never splits a multi-byte character across lines', () => {
    const folded = foldIcsLine(`SUMMARY:${'é'.repeat(100)}`);
    for (const line of folded.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(folded).not.toContain('�');
  });
});

describe('buildIcsCalendar', () => {
  const event = {
    uid: 'entry-1@tcrm',
    start: new Date('2026-10-05T06:00:00.000Z'),
    end: new Date('2026-10-05T14:00:00.000Z'),
    summary: 'Műszak — Kispest',
    location: 'Kispest',
    description: 'Feladat: pickup',
    sequence: 3,
    lastModified: new Date('2026-10-01T10:00:00.000Z'),
  };

  it('wraps events in a well-formed VCALENDAR', () => {
    const ics = buildIcsCalendar([event], { calendarName: 'Beosztás' });
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('UID:entry-1@tcrm');
    expect(ics).toContain('DTSTART:20261005T060000Z');
    expect(ics).toContain('DTEND:20261005T140000Z');
    expect(ics).toContain('SEQUENCE:3');
    expect(ics).toContain('LAST-MODIFIED:20261001T100000Z');
    expect(ics).toContain('LOCATION:Kispest');
  });

  it('uses CRLF line endings throughout', () => {
    const ics = buildIcsCalendar([event], { calendarName: 'Beosztás' });
    expect(ics.split('\n').every((l) => l === '' || l.endsWith('\r'))).toBe(true);
  });

  it('adds a VALARM only when a reminder is asked for', () => {
    expect(buildIcsCalendar([event], { calendarName: 'B' })).not.toContain('BEGIN:VALARM');
    const withAlarm = buildIcsCalendar([event], { calendarName: 'B', reminderMinutes: 60 });
    expect(withAlarm).toContain('BEGIN:VALARM');
    expect(withAlarm).toContain('TRIGGER:-PT60M');
  });

  it('advertises a refresh interval for subscribed feeds', () => {
    const feed = buildIcsCalendar([event], {
      calendarName: 'B',
      refreshIntervalMinutes: 60,
    });
    expect(feed).toContain('REFRESH-INTERVAL;VALUE=DURATION:PT60M');
    expect(feed).toContain('X-PUBLISHED-TTL:PT60M');
  });

  it('produces a valid empty calendar', () => {
    const ics = buildIcsCalendar([], { calendarName: 'Üres' });
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).not.toContain('BEGIN:VEVENT');
  });
});
