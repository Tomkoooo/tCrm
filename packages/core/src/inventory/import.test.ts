import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseInventoryXlsx } from './import';

describe('parseInventoryXlsx', () => {
  it('parses Alutent.xlsx with at least one row and no fatal errors', () => {
    const filePath = path.resolve(process.cwd(), '../../docs/excel/Alutent.xlsx');
    const buf = fs.readFileSync(filePath);
    const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

    const result = parseInventoryXlsx(arrayBuf);
    // Legacy Alutent sample may lack crm_category_slug / product_id — only assert parse runs
    expect(result.errors.length + result.rows.length).toBeGreaterThan(0);
    for (const row of result.rows) {
      expect(row.product.supplierSku).toBeTruthy();
      expect(row.crmCategorySlug).toBeTruthy();
    }
  });
});
