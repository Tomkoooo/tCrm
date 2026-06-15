/** Hungarian public holidays (fixed + key movable dates). Extend yearly as needed. */
const HUNGARIAN_HOLIDAYS: Record<number, string[]> = {
  2024: [
    '2024-01-01',
    '2024-03-15',
    '2024-03-29',
    '2024-03-31',
    '2024-04-01',
    '2024-05-01',
    '2024-05-20',
    '2024-08-20',
    '2024-08-23',
    '2024-10-23',
    '2024-11-01',
    '2024-12-25',
    '2024-12-26',
  ],
  2025: [
    '2025-01-01',
    '2025-03-15',
    '2025-04-18',
    '2025-04-20',
    '2025-04-21',
    '2025-05-01',
    '2025-05-20',
    '2025-08-20',
    '2025-10-23',
    '2025-11-01',
    '2025-12-25',
    '2025-12-26',
  ],
  2026: [
    '2026-01-01',
    '2026-03-15',
    '2026-04-03',
    '2026-04-05',
    '2026-04-06',
    '2026-05-01',
    '2026-05-20',
    '2026-08-20',
    '2026-10-23',
    '2026-11-01',
    '2026-12-25',
    '2026-12-26',
  ],
  2027: [
    '2027-01-01',
    '2027-03-15',
    '2027-03-26',
    '2027-03-28',
    '2027-03-29',
    '2027-05-01',
    '2027-05-20',
    '2027-08-20',
    '2027-10-23',
    '2027-11-01',
    '2027-12-25',
    '2027-12-26',
  ],
};

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isHungarianPublicHoliday(date: Date): boolean {
  const year = date.getFullYear();
  const list = HUNGARIAN_HOLIDAYS[year] ?? [];
  return list.includes(dateKey(date));
}

export function isWorkday(date: Date): boolean {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return false;
  return !isHungarianPublicHoliday(date);
}

export function eachDayInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cur <= last) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export function formatDayLabels(dates: Date[]): string {
  if (dates.length === 0) return '';
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const groups: Date[][] = [];
  let group: Date[] = [sorted[0]!];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    const diff = (cur.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000);
    if (diff === 1) {
      group.push(cur);
    } else {
      groups.push(group);
      group = [cur];
    }
  }
  groups.push(group);

  return groups
    .map((g) => {
      if (g.length === 1) return String(g[0]!.getDate());
      if (g.length === 2) return `${g[0]!.getDate()}.${g[1]!.getDate()}`;
      return `${g[0]!.getDate()}-${g[g.length - 1]!.getDate()}`;
    })
    .join(',');
}

export function daysByMonthInYear(
  dates: Date[],
  year: number
): Record<number, { count: number; datesLabel: string }> {
  const result: Record<number, { count: number; datesLabel: string }> = {};
  for (let m = 1; m <= 12; m++) {
    const inMonth = dates.filter((d) => d.getFullYear() === year && d.getMonth() + 1 === m);
    result[m] = {
      count: inMonth.length,
      datesLabel: formatDayLabels(inMonth),
    };
  }
  return result;
}

export function splitDayCountByMonth(
  start: Date,
  end: Date
): Array<{ year: number; month: number; days: number }> {
  const days = eachDayInRange(start, end);
  const map = new Map<string, number>();
  for (const d of days) {
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].map(([key, count]) => {
    const [y, m] = key.split('-').map(Number);
    return { year: y!, month: m!, days: count };
  });
}
