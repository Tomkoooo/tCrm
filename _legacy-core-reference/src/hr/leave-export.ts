import * as XLSX from 'xlsx';
import { MONTH_NAMES, type LeaveSummaryRow } from './leave-summary';

export function exportLeaveSummaryXlsx(
  rows: LeaveSummaryRow[],
  options: { year: number; month?: number; sheetTitle?: string }
): ArrayBuffer {
  const { year, month, sheetTitle } = options;

  if (month != null) {
    const monthName = MONTH_NAMES[month - 1] ?? String(month);
    const sheetRows = rows.map((r) => {
      const cell = r.months[month]!;
      return {
        Cég: r.companyName,
        Dolgozó: r.employeeName,
        'Összesen kivehető nap': r.entitlementDays,
        [`${monthName} nap`]: cell.days,
        [`${monthName} dátumok`]: cell.datesLabel,
        'Felhasznált összesen': r.usedHolidayDays,
        Maradék: r.remainingDays,
      };
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sheetRows);
    XLSX.utils.book_append_sheet(wb, ws, sheetTitle ?? `Szabadság ${year}-${month}`);
    return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  }

  const header: Record<string, string | number> = {
    Név: '',
    'Összesen kivehető nap': '',
  };
  for (let m = 1; m <= 12; m++) {
    header[MONTH_NAMES[m - 1]!] = '';
    header[`${MONTH_NAMES[m - 1]!} dátum`] = '';
  }
  header['Felhasznált'] = '';
  header['Maradék'] = '';

  const sheetRows = rows.map((r) => {
    const row: Record<string, string | number> = {
      Név: r.employeeName,
      Cég: r.companyName,
      'Összesen kivehető nap': r.entitlementDays,
    };
    for (let m = 1; m <= 12; m++) {
      const cell = r.months[m]!;
      row[MONTH_NAMES[m - 1]!] = cell.days;
      const label = [cell.datesLabel, cell.sickLabel ? `beteg: ${cell.sickLabel}` : '']
        .filter(Boolean)
        .join('; ');
      row[`${MONTH_NAMES[m - 1]!} dátum`] = label;
    }
    row['Felhasznált'] = r.usedHolidayDays;
    row['Maradék'] = r.remainingDays;
    return row;
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sheetRows);
  XLSX.utils.book_append_sheet(wb, ws, sheetTitle ?? `Szabadság ${year}`);
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

export function exportOccasionalWorkersXlsx(rows: LeaveSummaryRow[], year: number): ArrayBuffer {
  const sheetRows = rows.map((r) => ({
    Név: r.employeeName,
    Cég: r.companyName,
    'Születési név': r.personalData?.birthName ?? '',
    'Szül.hely, idő': r.personalData?.birthPlaceDate ?? '',
    'Anyja neve': r.personalData?.mothersName ?? '',
    Lakcím: r.personalData?.address ?? '',
    TAJ: r.personalData?.taj ?? '',
    Adóazonosító: r.personalData?.taxId ?? '',
    'Összesen kivehető nap': r.entitlementDays,
    Felhasznált: r.usedHolidayDays,
    Maradék: r.remainingDays,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sheetRows);
  XLSX.utils.book_append_sheet(wb, ws, `Alkalmi ${year}`);
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
