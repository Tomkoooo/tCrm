import { parseHrDateOnly } from './hr-schedule-datetime';

const MONTH_NAMES_HU = [
  'január',
  'januar',
  'február',
  'februar',
  'március',
  'marcius',
  'április',
  'aprilis',
  'május',
  'majus',
  'június',
  'junius',
  'július',
  'julius',
  'augusztus',
  'szeptember',
  'október',
  'oktober',
  'november',
  'december',
] as const;

export type ParsedLeaveMonth = {
  holidayDayNumbers: number[];
  sickDayNumbers: number[];
  sickPayOnly: boolean;
  unparsedLabel?: string;
};

function dayKey(year: number, month: number, day: number): string {
  return `${year}-${month}-${day}`;
}

function parseMonthFromText(text: string): number | undefined {
  const lower = text.toLowerCase();
  for (let i = 0; i < 12; i++) {
    const variants = [MONTH_NAMES_HU[i * 2]!, MONTH_NAMES_HU[i * 2 + 1]!];
    if (variants.some((v) => lower.includes(v))) return i + 1;
  }
  const short = lower.match(/\b(nov|dec|jan|feb|mar|apr|máj|maj|jún|jun|júl|jul|aug|szep|okt)\b/i);
  if (!short) return undefined;
  const map: Record<string, number> = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    máj: 5,
    maj: 5,
    jún: 6,
    jun: 6,
    júl: 7,
    jul: 7,
    aug: 8,
    szep: 9,
    okt: 10,
    nov: 11,
    dec: 12,
  };
  return map[short[1]!.toLowerCase().slice(0, 3)];
}

function extractDayNumbers(fragment: string): number[] {
  const cleaned = fragment
    .replace(/\./g, ',')
    .replace(/-/g, ',')
    .replace(/\s+/g, '')
    .replace(/[^\d,]/g, '');
  if (!cleaned) return [];
  const days = cleaned
    .split(',')
    .map((p) => Number.parseInt(p, 10))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 31);
  return [...new Set(days)];
}

function expandRange(start: number, end: number): number[] {
  if (start > end) return [];
  const out: number[] = [];
  for (let d = start; d <= end; d++) out.push(d);
  return out;
}

/**
 * Parse Hungarian leave date labels from legacy Excel cells (e.g. "19-21", "5,6,7", "táppénz").
 */
export function parseLeaveDateLabel(
  label: string,
  year: number,
  defaultMonth: number
): ParsedLeaveMonth {
  const raw = String(label ?? '').trim();
  if (!raw) {
    return { holidayDayNumbers: [], sickDayNumbers: [], sickPayOnly: false };
  }

  const lower = raw.toLowerCase();
  if (/táppénz|tappenz|beteg/i.test(lower) && !/\d/.test(lower)) {
    return { holidayDayNumbers: [], sickDayNumbers: [], sickPayOnly: true };
  }

  const embeddedMonth = parseMonthFromText(lower);
  const month = embeddedMonth ?? defaultMonth;

  let working = lower
    .replace(/táppénz|tappenz|beteg/gi, '')
    .replace(
      /\b(január|januar|február|februar|március|marcius|április|aprilis|május|majus|június|junius|július|julius|augusztus|szeptember|október|oktober|november|december|nov|dec|jan|feb|mar|apr|jún|jun|júl|jul|aug|szep|okt)\b\.?/gi,
      ''
    )
    .trim();

  const isSick = /beteg|táppénz|tappenz/i.test(raw);
  const holidayDayNumbers: number[] = [];
  const sickDayNumbers: number[] = [];

  const rangeMatch = working.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})/);
  if (rangeMatch) {
    const days = expandRange(
      Number.parseInt(rangeMatch[1]!, 10),
      Number.parseInt(rangeMatch[2]!, 10)
    );
    (isSick ? sickDayNumbers : holidayDayNumbers).push(...days);
    working = working.replace(rangeMatch[0], '');
  }

  const listDays = extractDayNumbers(working);
  (isSick ? sickDayNumbers : holidayDayNumbers).push(...listDays);

  const target = isSick ? sickDayNumbers : holidayDayNumbers;
  const valid = target.filter((d) => d >= 1 && d <= 31);

  const unparsedLabel =
    valid.length === 0 && !/táppénz|tappenz/i.test(lower) && raw.length > 0 ? raw : undefined;

  return {
    holidayDayNumbers: isSick ? [] : valid,
    sickDayNumbers: isSick ? valid : [],
    sickPayOnly: /táppénz|tappenz/i.test(lower) && valid.length === 0,
    unparsedLabel,
  };
}

export function leaveDatesFromDayNumbers(
  year: number,
  month: number,
  dayNumbers: number[]
): Date[] {
  const out: Date[] = [];
  const seen = new Set<string>();
  for (const day of dayNumbers) {
    if (day < 1 || day > 31) continue;
    try {
      const d = parseHrDateOnly(
        `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      );
      if (d.getMonth() + 1 !== month) continue;
      const key = dayKey(year, month, day);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(d);
    } catch {
      // skip invalid calendar dates
    }
  }
  return out.sort((a, b) => a.getTime() - b.getTime());
}
