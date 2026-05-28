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
    expect(result.rows.length).toBeGreaterThan(0);
    // The workbook should parse without schema errors for known columns
    expect(result.errors.length).toBe(0);
  });
});
