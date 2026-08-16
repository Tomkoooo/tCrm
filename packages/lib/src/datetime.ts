/** HR beosztás időpontok — mindig Budapesti falióra idő (Europe/Budapest). */
export const HR_TIMEZONE = 'Europe/Budapest';

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour') % 24,
    minute: read('minute'),
    second: read('second'),
  };
}

function zonedPartsToUtcMs(parts: ZonedParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

/** YYYY-MM-DD or YYYY-MM-DDTHH:mm(:ss) → UTC Date for Budapest wall clock. */
export function parseHrDateTime(value: string): Date {
  const normalized = value.trim();
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) {
    throw new Error(`Érvénytelen dátum/idő: ${value}`);
  }

  const target: ZonedParts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4] ?? 0),
    minute: Number(match[5] ?? 0),
    second: Number(match[6] ?? 0),
  };
  const targetMs = zonedPartsToUtcMs(target);

  let utc = targetMs;
  for (let i = 0; i < 4; i++) {
    const current = getZonedParts(new Date(utc), HR_TIMEZONE);
    utc += targetMs - zonedPartsToUtcMs(current);
  }

  return new Date(utc);
}

/** YYYY-MM-DD → nap kezdete Budapest időben. */
export function parseHrDateOnly(value: string): Date {
  return parseHrDateTime(`${value}T00:00:00`);
}

/** Nap + HH:mm → Budapest falióra időpont. */
export function combineHrDayAndTime(day: Date, time: string): Date {
  const dateKey = formatHrDateKey(day);
  return parseHrDateTime(`${dateKey}T${time}:00`);
}

/** Date → YYYY-MM-DD Budapest időben. */
export function formatHrDateKey(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: HR_TIMEZONE }).format(date);
}

/** Megjelenítés: HH:mm Budapest időben. */
export function formatHrTime(date: Date): string {
  return new Intl.DateTimeFormat('hu-HU', {
    timeZone: HR_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/** `<input type="datetime-local">` érték Budapest falióra időben (YYYY-MM-DDTHH:mm). */
export function formatHrDateTimeLocal(date: Date): string {
  const parts = getZonedParts(date, HR_TIMEZONE);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

/** Egy műszak megjelenítése: „2026.06.15 08:00–16:00" vagy egész nap. */
export function formatScheduleRange(start: Date, end: Date, allDay = false): string {
  const day = formatHrDateKey(start);
  if (allDay) return `${day} (egész nap)`;
  const dayEnd = formatHrDateKey(end);
  if (day === dayEnd) {
    return `${day} ${formatHrTime(start)}–${formatHrTime(end)}`;
  }
  return `${day} ${formatHrTime(start)} – ${dayEnd} ${formatHrTime(end)}`;
}

/** Beosztás módosítás összefoglaló: „jelenlegi → javasolt". */
export function formatScheduleChangeSummary(
  originalStart?: Date,
  originalEnd?: Date,
  proposedStart?: Date,
  proposedEnd?: Date,
  allDay = false
): string {
  if (!proposedStart || !proposedEnd) return '—';
  const proposed = formatScheduleRange(proposedStart, proposedEnd, allDay);
  if (!originalStart || !originalEnd) return proposed;
  return `${formatScheduleRange(originalStart, originalEnd, allDay)} → ${proposed}`;
}

/** ISO / Date → naptár Date (hydration). */
export function toCalendarDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}
