/**
 * Minimal RFC 5545 writer for schedule feeds and one-off downloads.
 *
 * Kept dependency-free and UTC-only: every schedule entry already carries absolute
 * instants, so emitting `DTSTART:...Z` avoids shipping a VTIMEZONE block that Google
 * and iCloud would each interpret slightly differently.
 */

export type IcsEvent = {
  /** Stable per-event id — reused across re-exports so calendars update in place. */
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  location?: string;
  url?: string;
  /** Bumped when the event changes so subscribers pick up the new version. */
  sequence?: number;
  lastModified?: Date;
};

export type BuildIcsOptions = {
  calendarName: string;
  /** Minutes before start for a VALARM reminder; omit for none. */
  reminderMinutes?: number;
  /** Feed vs. one-off file — a published feed asks clients to refresh hourly. */
  refreshIntervalMinutes?: number;
  now?: Date;
};

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}

/** `YYYYMMDDTHHMMSSZ` */
export function formatIcsDate(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** Escapes the TEXT value type: backslash, semicolon, comma, newline. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/** RFC 5545 §3.1: fold content lines at 75 octets, continuation lines start with a space. */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const out: string[] = [];
  let current = '';
  let currentBytes = 0;
  let limit = 75;

  for (const char of line) {
    const charBytes = encoder.encode(char).length;
    if (currentBytes + charBytes > limit) {
      out.push(current);
      current = char;
      currentBytes = charBytes;
      limit = 74; // continuation lines spend one octet on the leading space
    } else {
      current += char;
      currentBytes += charBytes;
    }
  }
  out.push(current);

  return out.map((part, i) => (i === 0 ? part : ` ${part}`)).join('\r\n');
}

export function buildIcsCalendar(events: IcsEvent[], options: BuildIcsOptions): string {
  const stamp = formatIcsDate(options.now ?? new Date());

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//tCrm//Beosztas//HU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(options.calendarName)}`,
    `NAME:${escapeIcsText(options.calendarName)}`,
    'X-WR-TIMEZONE:Europe/Budapest',
  ];

  if (options.refreshIntervalMinutes) {
    lines.push(`REFRESH-INTERVAL;VALUE=DURATION:PT${options.refreshIntervalMinutes}M`);
    lines.push(`X-PUBLISHED-TTL:PT${options.refreshIntervalMinutes}M`);
  }

  for (const event of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${escapeIcsText(event.uid)}`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART:${formatIcsDate(event.start)}`);
    lines.push(`DTEND:${formatIcsDate(event.end)}`);
    lines.push(`SUMMARY:${escapeIcsText(event.summary)}`);
    if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
    if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);
    if (event.url) lines.push(`URL:${escapeIcsText(event.url)}`);
    lines.push(`SEQUENCE:${event.sequence ?? 0}`);
    if (event.lastModified) lines.push(`LAST-MODIFIED:${formatIcsDate(event.lastModified)}`);
    lines.push('TRANSP:OPAQUE');

    if (options.reminderMinutes && options.reminderMinutes > 0) {
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push(`DESCRIPTION:${escapeIcsText(event.summary)}`);
      lines.push(`TRIGGER:-PT${options.reminderMinutes}M`);
      lines.push('END:VALARM');
    }

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}
