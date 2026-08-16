import * as XLSX from 'xlsx';
import { connectDB, Company, Employee, ScheduleEntry, type IEmployee } from '@crm/db';
import type { Types } from 'mongoose';
import { parseHrDateOnly, parseLeaveDateLabel, leaveDatesFromDayNumbers } from '@crm/lib';
import { MONTH_NAMES } from './leave-summary';
import { upsertEmployeeLeaveYear } from './leave-years';
import { assertCompanyInScope } from './company-scope';

const MONTH_NAME_MAP = new Map<string, number>(
  MONTH_NAMES.map((name, idx) => [normalizeKey(name), idx + 1])
);

export type LeaveImportMonthCell = {
  month: number;
  holidayDays: number;
  datesLabel: string;
  isSick: boolean;
};

export type LeaveImportEmployeeRow = {
  sheetName: string;
  year: number;
  companyLabel: string;
  employeeName: string;
  entitlementDays: number;
  months: LeaveImportMonthCell[];
  rowIndex: number;
};

export type LeaveImportMatchStatus = 'matched' | 'company_unmatched' | 'employee_unmatched';

export type LeaveImportMatchedRow = LeaveImportEmployeeRow & {
  status: LeaveImportMatchStatus;
  companyId?: string;
  companyName?: string;
  employeeId?: string;
  matchedEmployeeName?: string;
  matchScore?: number;
};

export type LeaveImportPreview = {
  sheetNames: string[];
  rows: LeaveImportMatchedRow[];
  summary: {
    total: number;
    matched: number;
    companyUnmatched: number;
    employeeUnmatched: number;
  };
};

export type LeaveImportCommitResult = {
  entitlementsUpdated: number;
  offEntriesCreated: number;
  sickEntriesCreated: number;
  skipped: number;
  errors: string[];
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ');
}

function normalizePersonName(value: string): string {
  return normalizeKey(value);
}

function parseYearFromSheetName(sheetName: string): number | null {
  const match = sheetName.match(/(20\d{2})/);
  return match ? Number(match[1]) : null;
}

function isCompanyHeaderRow(row: unknown[]): boolean {
  const col0 = String(row[0] ?? '').trim();
  const col1 = String(row[1] ?? '').trim();
  if (!col0) return false;
  if (col1 === 'Összesen' || col1 === 'Összesen kivehető nap') return true;
  if (col0 === 'Név') return true;
  return false;
}

function isEmptyRow(row: unknown[]): boolean {
  return !String(row[0] ?? '').trim();
}

function detectMonthColumns(
  headerRow: unknown[]
): Array<{ month: number; countCol: number; datesCol?: number }> {
  const cols: Array<{ month: number; countCol: number; datesCol?: number }> = [];
  const header = headerRow.map((c) => String(c ?? '').trim());

  for (let i = 0; i < header.length; i++) {
    const month = MONTH_NAME_MAP.get(normalizeKey(header[i] ?? ''));
    if (!month) continue;

    const prev = String(header[i - 1] ?? '').trim();
    const next = String(header[i + 1] ?? '').trim();

    // Header row often has an empty cell before the month label; data counts sit one column left.
    const countCol = prev === '' && i > 0 ? i - 1 : i;
    const datesCol =
      next === '' || MONTH_NAME_MAP.has(normalizeKey(next)) ? countCol + 1 : undefined;

    if (!cols.some((c) => c.month === month)) {
      cols.push({ month, countCol, datesCol });
    }
  }

  if (cols.length >= 6) {
    return cols.sort((a, b) => a.month - b.month);
  }

  // Single-column format starting after Név + Összesen
  const fallback: Array<{ month: number; countCol: number; datesCol?: number }> = [];
  for (let i = 2; i < header.length; i++) {
    const month = MONTH_NAME_MAP.get(normalizeKey(header[i] ?? ''));
    if (month) fallback.push({ month, countCol: i });
  }
  return fallback.sort((a, b) => a.month - b.month);
}

function parseNumber(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  const s = String(value ?? '').trim();
  if (!s) return 0;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function leaveDatesFromCellLabel(
  label: string,
  year: number,
  month: number
): { dates: Date[]; isSick: boolean } {
  const parsed = parseLeaveDateLabel(label, year, month);
  const isSick = parsed.sickPayOnly || parsed.sickDayNumbers.length > 0;
  const dayNumbers = isSick ? parsed.sickDayNumbers : parsed.holidayDayNumbers;
  return {
    dates: leaveDatesFromDayNumbers(year, month, dayNumbers),
    isSick: isSick || parsed.sickPayOnly,
  };
}

function parseEmployeeRow(
  row: unknown[],
  monthCols: Array<{ month: number; countCol: number; datesCol?: number }>,
  ctx: { sheetName: string; year: number; companyLabel: string; rowIndex: number }
): LeaveImportEmployeeRow | null {
  const employeeName = String(row[0] ?? '').trim();
  if (!employeeName || employeeName === 'Név') return null;

  const entitlementDays = parseNumber(row[1]);
  const months: LeaveImportMonthCell[] = monthCols.map(({ month, countCol, datesCol }) => {
    const holidayDays = parseNumber(row[countCol]);
    const datesLabel = datesCol != null ? String(row[datesCol] ?? '').trim() : '';
    const parsed = parseLeaveDateLabel(datesLabel, ctx.year, month);
    const isSick =
      parsed.sickPayOnly ||
      parsed.sickDayNumbers.length > 0 ||
      datesLabel.toLowerCase().includes('táppénz') ||
      datesLabel.toLowerCase().includes('beteg');
    return {
      month,
      holidayDays: isSick ? 0 : holidayDays || parsed.holidayDayNumbers.length,
      datesLabel,
      isSick,
    };
  });

  return {
    sheetName: ctx.sheetName,
    year: ctx.year,
    companyLabel: ctx.companyLabel,
    employeeName,
    entitlementDays,
    months,
    rowIndex: ctx.rowIndex,
  };
}

export function parseLeaveSummaryWorkbook(
  buffer: ArrayBuffer,
  selectedSheets?: string[]
): LeaveImportEmployeeRow[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetNames = selectedSheets?.length
    ? selectedSheets.filter((n) => wb.SheetNames.includes(n))
    : wb.SheetNames;

  const rows: LeaveImportEmployeeRow[] = [];

  for (const sheetName of sheetNames) {
    const year = parseYearFromSheetName(sheetName);
    if (!year) continue;

    const data = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName]!, {
      header: 1,
      defval: '',
    });

    let companyLabel = '';
    let monthCols: Array<{ month: number; countCol: number; datesCol?: number }> = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i] ?? [];
      if (isEmptyRow(row)) continue;

      if (isCompanyHeaderRow(row)) {
        const nextLabel = String(row[0] ?? '').trim();
        if (nextLabel && nextLabel !== 'Név') companyLabel = nextLabel;
        const detected = detectMonthColumns(row);
        if (detected.length > 0) monthCols = detected;
        continue;
      }

      if (!companyLabel || monthCols.length === 0) continue;

      const parsed = parseEmployeeRow(row, monthCols, {
        sheetName,
        year,
        companyLabel,
        rowIndex: i + 1,
      });
      if (parsed) rows.push(parsed);
    }
  }

  return rows;
}

function scoreNameMatch(a: string, b: string): number {
  const na = normalizePersonName(a);
  const nb = normalizePersonName(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const aParts = new Set(na.split(' '));
  const bParts = new Set(nb.split(' '));
  let overlap = 0;
  for (const p of aParts) if (bParts.has(p) && p.length > 2) overlap++;
  const union = new Set([...aParts, ...bParts]).size;
  return union ? overlap / union : 0;
}

function scoreCompanyMatch(label: string, companyName: string): number {
  const a = normalizeKey(label);
  const b = normalizeKey(companyName);
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;
  return scoreNameMatch(label, companyName);
}

export function matchLeaveImportRows(
  rows: LeaveImportEmployeeRow[],
  companies: Array<{ _id: Types.ObjectId | string; name: string }>,
  employees: Array<Pick<IEmployee, '_id' | 'name' | 'companyId'>>
): LeaveImportMatchedRow[] {
  return rows.map((row) => {
    let bestCompany: { id: string; name: string; score: number } | null = null;
    for (const c of companies) {
      const score = scoreCompanyMatch(row.companyLabel, c.name);
      if (score >= 0.7 && (!bestCompany || score > bestCompany.score)) {
        bestCompany = { id: String(c._id), name: c.name, score };
      }
    }

    if (!bestCompany) {
      return { ...row, status: 'company_unmatched' as const };
    }

    let bestEmployee: { id: string; name: string; score: number } | null = null;
    for (const e of employees) {
      if (String(e.companyId) !== bestCompany.id) continue;
      const score = scoreNameMatch(row.employeeName, e.name);
      if (score >= 0.65 && (!bestEmployee || score > bestEmployee.score)) {
        bestEmployee = { id: String(e._id), name: e.name, score };
      }
    }

    if (!bestEmployee) {
      return {
        ...row,
        status: 'employee_unmatched' as const,
        companyId: bestCompany.id,
        companyName: bestCompany.name,
        matchScore: bestCompany.score,
      };
    }

    return {
      ...row,
      status: 'matched' as const,
      companyId: bestCompany.id,
      companyName: bestCompany.name,
      employeeId: bestEmployee.id,
      matchedEmployeeName: bestEmployee.name,
      matchScore: bestEmployee.score,
    };
  });
}

export function summarizeLeaveImportPreview(
  rows: LeaveImportMatchedRow[]
): LeaveImportPreview['summary'] {
  return {
    total: rows.length,
    matched: rows.filter((r) => r.status === 'matched').length,
    companyUnmatched: rows.filter((r) => r.status === 'company_unmatched').length,
    employeeUnmatched: rows.filter((r) => r.status === 'employee_unmatched').length,
  };
}

export async function buildLeaveImportPreview(
  buffer: ArrayBuffer,
  selectedSheets: string[] | undefined,
  allowedCompanyIds: Types.ObjectId[] | null
): Promise<LeaveImportPreview> {
  await connectDB();
  const parsed = parseLeaveSummaryWorkbook(buffer, selectedSheets);
  const wb = XLSX.read(buffer, { type: 'array' });

  const companyFilter =
    allowedCompanyIds === null
      ? {}
      : allowedCompanyIds.length
        ? { _id: { $in: allowedCompanyIds } }
        : { _id: { $in: [] } };

  const [companies, employees] = await Promise.all([
    Company.find({ isActive: true, ...companyFilter })
      .select({ name: 1 })
      .lean()
      .exec(),
    Employee.find({
      isActive: true,
      ...(allowedCompanyIds?.length ? { companyId: { $in: allowedCompanyIds } } : {}),
    })
      .select({ name: 1, companyId: 1 })
      .lean()
      .exec(),
  ]);

  const rows = matchLeaveImportRows(parsed, companies, employees);
  return {
    sheetNames: wb.SheetNames,
    rows,
    summary: summarizeLeaveImportPreview(rows),
  };
}

export async function commitLeaveImport(
  rows: LeaveImportMatchedRow[],
  actorUserId: Types.ObjectId,
  permissions: string[]
): Promise<LeaveImportCommitResult> {
  await connectDB();
  const result: LeaveImportCommitResult = {
    entitlementsUpdated: 0,
    offEntriesCreated: 0,
    sickEntriesCreated: 0,
    skipped: 0,
    errors: [],
  };

  for (const row of rows) {
    if (row.status !== 'matched' || !row.employeeId || !row.companyId) {
      result.skipped++;
      continue;
    }

    try {
      const employeeId = row.employeeId as unknown as Types.ObjectId;
      const companyId = row.companyId as unknown as Types.ObjectId;
      await assertCompanyInScope(companyId, actorUserId, permissions);

      if (row.entitlementDays > 0) {
        await upsertEmployeeLeaveYear(
          employeeId,
          companyId,
          row.year,
          row.entitlementDays,
          actorUserId,
          actorUserId,
          permissions,
          `Excel import (${row.sheetName})`
        );
        result.entitlementsUpdated++;
      }

      for (const cell of row.months) {
        if (cell.isSick && cell.datesLabel) {
          const { dates } = leaveDatesFromCellLabel(cell.datesLabel, row.year, cell.month);
          const sickDays =
            dates.length ||
            cell.holidayDays ||
            (cell.datesLabel.toLowerCase().includes('táppénz') ? 1 : 0);
          if (sickDays > 0 && dates.length === 0) {
            const start = parseHrDateOnly(`${row.year}-${String(cell.month).padStart(2, '0')}-01`);
            const end = parseHrDateOnly(`${row.year}-${String(cell.month).padStart(2, '0')}-01`);
            await ScheduleEntry.create({
              employeeId,
              companyId,
              start,
              end,
              allDay: true,
              kind: 'off',
              title: 'táppénz',
              notes: `Import: ${cell.datesLabel}`,
              createdBy: actorUserId,
              updatedBy: actorUserId,
            });
            result.sickEntriesCreated++;
            continue;
          }
          for (const day of dates) {
            await ScheduleEntry.create({
              employeeId,
              companyId,
              start: day,
              end: day,
              allDay: true,
              kind: 'off',
              title: 'táppénz',
              notes: `Import: ${cell.datesLabel}`,
              createdBy: actorUserId,
              updatedBy: actorUserId,
            });
            result.sickEntriesCreated++;
          }
          continue;
        }

        const { dates } = leaveDatesFromCellLabel(cell.datesLabel, row.year, cell.month);
        if (dates.length === 0 && cell.holidayDays === 0) continue;

        for (const day of dates) {
          const exists = await ScheduleEntry.findOne({
            employeeId,
            kind: 'off',
            start: { $lte: day },
            end: { $gte: day },
            title: /szabadság/i,
          }).exec();
          if (exists) continue;

          await ScheduleEntry.create({
            employeeId,
            companyId,
            start: day,
            end: day,
            allDay: true,
            kind: 'off',
            title: 'szabadság',
            notes: cell.datesLabel ? `Import: ${cell.datesLabel}` : 'Excel import',
            createdBy: actorUserId,
            updatedBy: actorUserId,
          });
          result.offEntriesCreated++;
        }
      }
    } catch (e) {
      result.errors.push(
        `${row.employeeName} (${row.companyLabel}): ${e instanceof Error ? e.message : 'Ismeretlen hiba'}`
      );
      result.skipped++;
    }
  }

  return result;
}
