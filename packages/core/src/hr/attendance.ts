import { eachDayInRange, daysByMonthInYear } from '@crm/lib';

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

export function datesInMonth(dates: Date[], year: number, month: number): Date[] {
  return dates.filter((d) => d.getFullYear() === year && d.getMonth() + 1 === month);
}

export function collectOffDaysFromEntries(
  entries: Array<{ start: Date; end: Date; title?: string }>,
  year: number,
  kind: 'holiday' | 'sick',
  month?: number
): Date[] {
  const dates: Date[] = [];
  for (const e of entries) {
    const title = (e.title ?? '').toLowerCase();
    const isHoliday = title.includes('szabadság') && !title.includes('beteg');
    const isSick = title.includes('beteg');
    if (kind === 'holiday' && !isHoliday && title !== 'szabadság') continue;
    if (kind === 'sick' && !isSick) continue;
    for (const d of eachDayInRange(e.start, e.end)) {
      if (d.getFullYear() !== year) continue;
      if (month != null && d.getMonth() + 1 !== month) continue;
      dates.push(d);
    }
  }
  return dates;
}

export function collectRequestDays(
  requests: Array<{
    type: string;
    payload?: { startDate?: Date; endDate?: Date };
  }>,
  year: number,
  kind: 'holiday' | 'sick',
  month?: number
): Date[] {
  const dates: Date[] = [];
  for (const req of requests) {
    const start = req.payload?.startDate;
    const end = req.payload?.endDate;
    if (!start || !end) continue;
    const days = eachDayInRange(new Date(start), new Date(end));
    if (req.type === 'holiday' && kind === 'holiday') {
      dates.push(...days.filter((d) => matchesYearMonth(d, year, month)));
    }
    if (req.type === 'sick_leave' && kind === 'sick') {
      dates.push(...days.filter((d) => matchesYearMonth(d, year, month)));
    }
  }
  return dates;
}

function matchesYearMonth(d: Date, year: number, month?: number): boolean {
  if (d.getFullYear() !== year) return false;
  if (month != null && d.getMonth() + 1 !== month) return false;
  return true;
}

export function formatDatesLabel(dates: Date[]): string {
  if (!dates.length) return '';
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  return sorted.map((d) => `${d.getMonth() + 1}/${d.getDate()}`).join(', ');
}

export function countWorkedHoursFromShifts(
  shiftEntries: Array<{ start: Date; end: Date }>,
  contractedWeeklyHours?: number | null
): number {
  let totalMs = 0;
  for (const e of shiftEntries) {
    const s = new Date(e.start).getTime();
    const en = new Date(e.end).getTime();
    if (en > s) totalMs += en - s;
  }
  let hours = Math.round((totalMs / (1000 * 60 * 60)) * 100) / 100;
  if (contractedWeeklyHours != null && contractedWeeklyHours > 0) {
    hours = Math.min(hours, contractedWeeklyHours * 4);
  }
  return hours;
}

export { daysByMonthInYear };
