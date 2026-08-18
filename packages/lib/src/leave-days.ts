/** Inclusive calendar days from start→end (local date parts). */
export function eachDayInRange(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cur <= last) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function dedupeDates(dates: Date[]): Date[] {
  const keys = new Set<string>();
  const out: Date[] = [];
  for (const d of dates) {
    const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (keys.has(k)) continue;
    keys.add(k);
    out.push(d);
  }
  return out;
}

export function formatDatesLabel(dates: Date[]): string {
  if (!dates.length) return '';
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  return sorted.map((d) => `${d.getMonth() + 1}/${d.getDate()}`).join(', ');
}

export function daysByMonthInYear(
  dates: Date[],
  year: number
): Record<number, { count: number; datesLabel: string }> {
  const byMonth: Record<number, Date[]> = {};
  for (let m = 1; m <= 12; m++) byMonth[m] = [];
  for (const d of dates) {
    if (d.getFullYear() !== year) continue;
    byMonth[d.getMonth() + 1]!.push(d);
  }
  const result: Record<number, { count: number; datesLabel: string }> = {};
  for (let m = 1; m <= 12; m++) {
    const list = byMonth[m]!;
    result[m] = { count: list.length, datesLabel: formatDatesLabel(list) };
  }
  return result;
}

/** Parse labels like "1, 2, 5-7" or "beteg: 3,4" into day numbers. */
export function parseLeaveDateLabel(
  label: string,
  _year: number,
  _month: number
): {
  holidayDayNumbers: number[];
  sickDayNumbers: number[];
  sickPayOnly: boolean;
} {
  const raw = label.trim();
  if (!raw) return { holidayDayNumbers: [], sickDayNumbers: [], sickPayOnly: false };

  const lower = raw.toLowerCase();
  const sickPayOnly =
    (lower.includes('beteg') || lower.includes('táppénz') || lower.includes('tappenz')) &&
    !/\d/.test(raw);

  const isSickSection =
    lower.includes('beteg') || lower.includes('táppénz') || lower.includes('tappenz');
  const numbers = expandDayTokenList(
    raw.replace(/beteg[^0-9]*/gi, '').replace(/táppénz[^0-9]*/gi, '')
  );

  if (isSickSection || sickPayOnly) {
    return { holidayDayNumbers: [], sickDayNumbers: numbers, sickPayOnly };
  }
  return { holidayDayNumbers: numbers, sickDayNumbers: [], sickPayOnly: false };
}

function expandDayTokenList(raw: string): number[] {
  const out = new Set<number>();
  const tokens = raw
    .split(/[,;\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  for (const token of tokens) {
    const range = token.match(/^(\d{1,2})\s*[-–—]\s*(\d{1,2})$/);
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      if (a >= 1 && b <= 31 && a <= b) {
        for (let d = a; d <= b; d++) out.add(d);
      }
      continue;
    }
    const n = Number(token);
    if (Number.isInteger(n) && n >= 1 && n <= 31) out.add(n);
  }
  return [...out].sort((a, b) => a - b);
}

export function leaveDatesFromDayNumbers(year: number, month: number, days: number[]): Date[] {
  return days
    .filter((d) => d >= 1 && d <= 31)
    .map((d) => new Date(year, month - 1, d))
    .filter((dt) => dt.getMonth() === month - 1);
}

const PALETTE = [
  '#2563eb',
  '#16a34a',
  '#ca8a04',
  '#dc2626',
  '#9333ea',
  '#0891b2',
  '#ea580c',
  '#4f46e5',
];

export function resolveEmployeeScheduleColor(employeeId: string, explicit?: string): string {
  if (explicit?.trim()) return explicit.trim();
  let hash = 0;
  for (let i = 0; i < employeeId.length; i++) {
    hash = (hash * 31 + employeeId.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length]!;
}

export function scheduleKindFallbackColor(kind?: string): string {
  switch (kind) {
    case 'off':
      return '#64748b';
    case 'shift':
      return '#0f766e';
    case 'other':
      return '#7c3aed';
    case 'job':
    default:
      return '#2563eb';
  }
}
