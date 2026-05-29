import * as XLSX from 'xlsx';

export type HrExportRow = {
  companyName: string;
  companySlug: string;
  employeeName: string;
  employeeNumber: string;
  department: string;
  year: number;
  month: number;
  workedHours: number;
  holidayDays: number;
  sickDays: number;
  sickPayAmount: number | '';
  notes: string;
};

export function exportHrMonthlyXlsx(rows: HrExportRow[]): ArrayBuffer {
  const sheetRows = rows.map((r) => ({
    Cég: r.companyName,
    'Cég slug': r.companySlug,
    Dolgozó: r.employeeName,
    'Dolgozói szám': r.employeeNumber,
    Osztály: r.department,
    Év: r.year,
    Hónap: r.month,
    'Ledolgozott óra': r.workedHours,
    'Szabadság nap': r.holidayDays,
    'Beteg nap': r.sickDays,
    'Táppénz (HUF)': r.sickPayAmount,
    Megjegyzés: r.notes,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sheetRows);
  XLSX.utils.book_append_sheet(wb, ws, 'HR kimutatás');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
