import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { leaveDatesFromDayNumbers, parseLeaveDateLabel, formatHrDateKey } from '@crm/lib';
import {
  matchLeaveImportRows,
  parseLeaveSummaryWorkbook,
  summarizeLeaveImportPreview,
} from './leave-import';

function fixturePath(): string | null {
  const candidates = [
    resolve(process.cwd(), 'docs/excel/Szabadság összesítő_2026_május.xlsx'),
    resolve(process.cwd(), '../../docs/excel/Szabadság összesítő_2026_május.xlsx'),
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

describe('parseLeaveDateLabel', () => {
  it('parses day ranges', () => {
    const parsed = parseLeaveDateLabel('19-21', 2026, 5);
    const dates = leaveDatesFromDayNumbers(2026, 5, parsed.holidayDayNumbers);
    expect(parsed.sickPayOnly).toBe(false);
    expect(dates.map((d) => formatHrDateKey(d))).toEqual([
      '2026-05-19',
      '2026-05-20',
      '2026-05-21',
    ]);
  });

  it('parses comma-separated days', () => {
    const parsed = parseLeaveDateLabel('5,6,7', 2026, 3);
    const dates = leaveDatesFromDayNumbers(2026, 3, parsed.holidayDayNumbers);
    expect(dates.map((d) => formatHrDateKey(d))).toEqual([
      '2026-03-05',
      '2026-03-06',
      '2026-03-07',
    ]);
  });

  it('detects sick leave labels', () => {
    const parsed = parseLeaveDateLabel('táppénz', 2026, 4);
    expect(parsed.sickPayOnly).toBe(true);
  });
});

describe('parseLeaveSummaryWorkbook', () => {
  it('parses real Szabadság 2026 sheet with company sections', () => {
    const path = fixturePath();
    if (!path) return;
    const buffer = readFileSync(path);
    const rows = parseLeaveSummaryWorkbook(
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      ['Szabadság 2026']
    );

    expect(rows.length).toBeGreaterThan(5);
    const sakkmed = rows.find(
      (r) => r.employeeName === 'Balázs Gábor' && r.companyLabel === 'Sakkmed'
    );
    expect(sakkmed?.entitlementDays).toBe(39);
    expect(sakkmed?.months.find((m) => m.month === 1)?.holidayDays).toBe(3);

    const esemeny = rows.find(
      (r) => r.employeeName === 'Lukács-Kovács Henriette' && r.companyLabel === 'Eseményszervezés'
    );
    expect(esemeny).toBeTruthy();
  });

  it('lists all year sheets in workbook', () => {
    const path = fixturePath();
    if (!path) return;
    const buffer = readFileSync(path);
    const wb = XLSX.read(buffer);
    expect(wb.SheetNames.some((n) => n.includes('2026'))).toBe(true);
  });
});

describe('matchLeaveImportRows', () => {
  it('matches company and employee by name', () => {
    const rows = [
      {
        sheetName: 'Szabadság 2026',
        year: 2026,
        companyLabel: 'Sakkmed',
        employeeName: 'Balázs Gábor',
        entitlementDays: 39,
        months: [],
        rowIndex: 2,
      },
    ];
    const matched = matchLeaveImportRows(
      rows,
      [{ _id: 'c1', name: 'Sakkmed Kft.' }],
      [{ _id: 'e1', name: 'Balázs Gábor', companyId: 'c1' }]
    );
    expect(matched[0]?.status).toBe('matched');
    expect(matched[0]?.employeeId).toBe('e1');
  });

  it('flags unmatched employee', () => {
    const rows = [
      {
        sheetName: 'Szabadság 2026',
        year: 2026,
        companyLabel: 'Sakkmed',
        employeeName: 'Ismeretlen Név',
        entitlementDays: 20,
        months: [],
        rowIndex: 2,
      },
    ];
    const matched = matchLeaveImportRows(
      rows,
      [{ _id: 'c1', name: 'Sakkmed' }],
      [{ _id: 'e1', name: 'Másik Dolgozó', companyId: 'c1' }]
    );
    expect(matched[0]?.status).toBe('employee_unmatched');
  });
});

describe('summarizeLeaveImportPreview', () => {
  it('counts match statuses', () => {
    const summary = summarizeLeaveImportPreview([
      { status: 'matched' } as never,
      { status: 'employee_unmatched' } as never,
    ]);
    expect(summary.total).toBe(2);
    expect(summary.matched).toBe(1);
    expect(summary.employeeUnmatched).toBe(1);
  });
});
