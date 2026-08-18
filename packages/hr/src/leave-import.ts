import * as XLSX from 'xlsx';
import { connectDB, Company, Employee, ScheduleEntry, type IEmployee } from '@crm/db-core';
import { parseLeaveDateLabel, leaveDatesFromDayNumbers, parseHrDateOnly } from '@crm/lib';
import type { Types } from 'mongoose';
import mongoose from 'mongoose';
import { MONTH_NAMES } from './leave-summary';
import { upsertEmployeeLeaveYear } from './leave-years';

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

export type LeaveImportMatchedRow = LeaveImportEmployeeRow & {
  status: 'matched' | 'company_unmatched' | 'employee_unmatched';
  companyId?: string;
  companyName?: string;
  employeeId?: string;
  matchedEmployeeName?: string;
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
  skipped: number;
  errors: string[];
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ');
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
    const countCol = prev === '' && i > 0 ? i - 1 : i;
    const datesCol =
      next === '' || MONTH_NAME_MAP.has(normalizeKey(next)) ? countCol + 1 : undefined;
    if (!cols.some((c) => c.month === month)) {
      cols.push({ month, countCol, datesCol });
    }
  }
  return cols.sort((a, b) => a.month - b.month);
}

function parseNumber(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  const s = String(value ?? '').trim();
  if (!s) return 0;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function parseEmployeeRow(
  row: unknown[],
  monthCols: Array<{ month: number; countCol: number; datesCol?: number }>,
  ctx: { sheetName: string; year: number; companyLabel: string; rowIndex: number }
): LeaveImportEmployeeRow | null {
  const employeeName = String(row[0] ?? '').trim();
  if (!employeeName || employeeName === 'Név') return null;
  const entitlementDays = parseNumber(row[1]);
  const months: LeaveImportMonthCell[] = [];
  for (const col of monthCols) {
    const count = parseNumber(row[col.countCol]);
    const datesLabel = col.datesCol != null ? String(row[col.datesCol] ?? '').trim() : '';
    const parsed = parseLeaveDateLabel(datesLabel, ctx.year, col.month);
    months.push({
      month: col.month,
      holidayDays: count,
      datesLabel,
      isSick: parsed.sickPayOnly || parsed.sickDayNumbers.length > 0,
    });
  }
  return {
    ...ctx,
    employeeName,
    entitlementDays,
    months,
  };
}

function fuzzyNameScore(a: string, b: string): number {
  const na = normalizeKey(a);
  const nb = normalizeKey(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  return 0;
}

export function previewLeaveImport(buffer: Buffer): LeaveImportPreview {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const rows: LeaveImportEmployeeRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const year = parseYearFromSheetName(sheetName);
    if (!year) continue;
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
    let companyLabel = '';
    let monthCols: Array<{ month: number; countCol: number; datesCol?: number }> = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i] ?? [];
      if (isCompanyHeaderRow(row)) {
        companyLabel = String(row[0] ?? '').trim();
        const next = data[i + 1] ?? [];
        const maybeHeader = String(next[0] ?? '').trim() === 'Név' ? next : row;
        monthCols = detectMonthColumns(maybeHeader);
        continue;
      }
      if (!companyLabel || !monthCols.length) continue;
      if (!String(row[0] ?? '').trim()) continue;
      const parsed = parseEmployeeRow(row, monthCols, {
        sheetName,
        year,
        companyLabel,
        rowIndex: i + 1,
      });
      if (parsed) rows.push(parsed);
    }
  }

  return {
    sheetNames: workbook.SheetNames,
    rows: rows.map((r) => ({ ...r, status: 'employee_unmatched' as const })),
    summary: {
      total: rows.length,
      matched: 0,
      companyUnmatched: 0,
      employeeUnmatched: rows.length,
    },
  };
}

export async function matchLeaveImportPreview(
  preview: LeaveImportPreview
): Promise<LeaveImportPreview> {
  await connectDB();
  const companies = await Company.find({ isActive: true }).lean().exec();
  const employees = await Employee.find({ isActive: true }).lean().exec();

  const matchedRows: LeaveImportMatchedRow[] = preview.rows.map((row) => {
    const company = companies.find(
      (c) =>
        normalizeKey(c.name) === normalizeKey(row.companyLabel) ||
        normalizeKey(c.name).includes(normalizeKey(row.companyLabel)) ||
        normalizeKey(row.companyLabel).includes(normalizeKey(c.name))
    );
    if (!company) {
      return { ...row, status: 'company_unmatched' };
    }
    const candidates = employees.filter((e) => e.companyId.toString() === company._id.toString());
    let best: IEmployee | null = null;
    let bestScore = 0;
    for (const emp of candidates) {
      const score = fuzzyNameScore(emp.name, row.employeeName);
      if (score > bestScore) {
        bestScore = score;
        best = emp as IEmployee;
      }
    }
    if (!best || bestScore < 0.8) {
      return {
        ...row,
        status: 'employee_unmatched',
        companyId: company._id.toString(),
        companyName: company.name,
      };
    }
    return {
      ...row,
      status: 'matched',
      companyId: company._id.toString(),
      companyName: company.name,
      employeeId: best._id.toString(),
      matchedEmployeeName: best.name,
    };
  });

  return {
    sheetNames: preview.sheetNames,
    rows: matchedRows,
    summary: {
      total: matchedRows.length,
      matched: matchedRows.filter((r) => r.status === 'matched').length,
      companyUnmatched: matchedRows.filter((r) => r.status === 'company_unmatched').length,
      employeeUnmatched: matchedRows.filter((r) => r.status === 'employee_unmatched').length,
    },
  };
}

export async function commitLeaveImport(params: {
  rows: LeaveImportMatchedRow[];
  actorUserId: Types.ObjectId | string;
}): Promise<LeaveImportCommitResult> {
  await connectDB();
  const actor =
    typeof params.actorUserId === 'string'
      ? new mongoose.Types.ObjectId(params.actorUserId)
      : params.actorUserId;

  let entitlementsUpdated = 0;
  let offEntriesCreated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of params.rows) {
    if (row.status !== 'matched' || !row.employeeId || !row.companyId) {
      skipped += 1;
      continue;
    }
    try {
      await upsertEmployeeLeaveYear({
        employeeId: row.employeeId,
        year: row.year,
        entitlementDays: row.entitlementDays,
        updatedBy: actor,
      });
      entitlementsUpdated += 1;

      for (const cell of row.months) {
        if (!cell.datesLabel && cell.holidayDays <= 0) continue;
        const parsed = parseLeaveDateLabel(cell.datesLabel, row.year, cell.month);
        const dayNumbers = cell.isSick
          ? parsed.sickDayNumbers
          : parsed.holidayDayNumbers.length
            ? parsed.holidayDayNumbers
            : [];
        const dates =
          dayNumbers.length > 0
            ? leaveDatesFromDayNumbers(row.year, cell.month, dayNumbers)
            : cell.holidayDays > 0
              ? []
              : [];

        for (const day of dates) {
          const start = parseHrDateOnly(
            `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
          );
          const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1000);
          const title = cell.isSick ? 'Betegszabadság' : 'Szabadság';
          const exists = await ScheduleEntry.findOne({
            employeeId: row.employeeId,
            kind: 'off',
            start: { $lt: end },
            end: { $gt: start },
            title,
          })
            .lean()
            .exec();
          if (exists) continue;
          await ScheduleEntry.create({
            employeeId: new mongoose.Types.ObjectId(row.employeeId),
            companyId: new mongoose.Types.ObjectId(row.companyId),
            start,
            end,
            kind: 'off',
            title,
            sourceRef: {
              module: 'hr',
              refType: 'leave_import',
              refId: new mongoose.Types.ObjectId(),
              label: `${row.year}-${cell.month}`,
            },
            createdBy: actor,
            updatedBy: actor,
          });
          offEntriesCreated += 1;
        }
      }
    } catch (err) {
      errors.push(`${row.employeeName}: ${err instanceof Error ? err.message : 'import hiba'}`);
    }
  }

  return { entitlementsUpdated, offEntriesCreated, skipped, errors };
}
