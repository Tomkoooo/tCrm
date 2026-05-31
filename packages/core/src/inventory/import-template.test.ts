import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import {
  getImportTemplateXlsx,
  IMPORT_GUIDE_SHEET,
  IMPORT_TEMPLATE_SHEET,
} from './import-template';
import { parseInventoryRows } from './import';

describe('getImportTemplateXlsx', () => {
  it('produces a workbook with Termékek and Útmutató sheets', () => {
    const buf = getImportTemplateXlsx();
    const wb = XLSX.read(buf, { type: 'array' });
    expect(wb.SheetNames).toContain(IMPORT_TEMPLATE_SHEET);
    expect(wb.SheetNames).toContain(IMPORT_GUIDE_SHEET);
  });

  it('example row parses without errors', () => {
    const buf = getImportTemplateXlsx();
    const wb = XLSX.read(buf, { type: 'array' });
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      wb.Sheets[IMPORT_TEMPLATE_SHEET]!,
      {
        defval: '',
      }
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const result = parseInventoryRows(rows);
    expect(result.errors).toHaveLength(0);
    expect(result.rows[0]!.product.supplierSku).toBe('3301');
    expect(result.rows[0]!.crmCategorySlug).toBe('pelda-kategoria');
  });
});
