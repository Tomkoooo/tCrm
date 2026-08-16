import { describe, expect, it } from 'vitest';
import { warehouseKeysFromStockColumns } from './warehouse-columns';
import { resolveRowWarehouseKeys } from './import';
import type { ParsedInventoryRow } from './import';

describe('warehouseKeysFromStockColumns', () => {
  it('maps warehouse stock columns to CRM keys', () => {
    expect(
      warehouseKeysFromStockColumns({
        'warehouse 1.': 5,
        'warehouse 2.': 0,
        'warehouse 3.': 12,
      })
    ).toEqual(['kispest', 'erzsebet', 'recsei']);
  });
});

describe('resolveRowWarehouseKeys', () => {
  it('derives keys from stock columns only', () => {
    const row = {
      crmWarehouseSlugs: ['kispest'],
      warehouses: { 'warehouse 2.': 3 },
    } as unknown as ParsedInventoryRow;

    expect(resolveRowWarehouseKeys(row)).toEqual(['erzsebet']);
  });

  it('returns empty when no stock columns', () => {
    const row = { crmWarehouseSlugs: ['kispest'], warehouses: {} } as unknown as ParsedInventoryRow;
    expect(resolveRowWarehouseKeys(row)).toEqual([]);
  });
});
