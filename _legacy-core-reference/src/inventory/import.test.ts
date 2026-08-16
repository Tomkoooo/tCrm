import { describe, expect, it } from 'vitest';
import { parseInventoryRows, resolveRowWarehouseKeys } from './import';

describe('parseInventoryRows', () => {
  it('parses rows without warehouse or stock data', () => {
    const result = parseInventoryRows([
      {
        product_id: '3301',
        crm_category_slug: 'alutent',
        name_en: 'Test product',
      },
    ]);

    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]!.warehouses).toEqual({});
  });

  it('warns when crm_warehouse_slug is present without stock columns', () => {
    const result = parseInventoryRows([
      {
        product_id: '3301',
        crm_category_slug: 'alutent',
        crm_warehouse_slug: 'kispest',
        name_en: 'Test product',
      },
    ]);

    expect(result.warnings.some((w) => w.field === 'crm_warehouse_slug')).toBe(true);
  });

  it('parses stock columns into warehouses map', () => {
    const result = parseInventoryRows([
      {
        product_id: '3301',
        crm_category_slug: 'alutent',
        name_en: 'Test product',
        'warehouse 1.': 5,
      },
    ]);

    expect(result.rows[0]!.warehouses).toEqual({ 'warehouse 1.': 5 });
    expect(resolveRowWarehouseKeys(result.rows[0]!)).toEqual(['kispest']);
  });

  it('accepts uppercase category slug', () => {
    const result = parseInventoryRows([
      {
        product_id: '3301',
        crm_category_slug: 'ALUTENT',
        name_en: 'Test product',
      },
    ]);

    expect(result.errors).toHaveLength(0);
    expect(result.rows[0]!.crmCategorySlug).toBe('alutent');
  });

  it('parses rental fees when retail price columns are dashes (Alutent-style)', () => {
    const result = parseInventoryRows(
      [
        {
          product_id_SM: '100003301',
          product_id: '-',
          brand: 'ALUTENT',
          name_en: 'Alutent folding tent',
          recommendet_retail_price_with_german_tax: '-',
          recommendet_retail_price_with_tax_HUF: '-',
          streetprice_with_german_tax: '-',
          streetprice_without_HUN_tax_HUF: '-',
          merchant_price: '-',
          merchant_price_HUF: '-',
          RentFeeDay: 16000,
          RentFeeWeekend: 26000,
          RentFeeWeek: 36000,
          Relatedproduct_1: '100010301',
          Relatedproduct_pc_1: 4,
        },
      ],
      { skuMode: 'from_sm' }
    );

    expect(result.errors).toHaveLength(0);
    const row = result.rows[0]!;
    expect(row.product.rental?.rentFeeDay).toBe(16000);
    expect(row.product.rental?.rentFeeWeekend).toBe(26000);
    expect(row.product.rental?.rentFeeWeek).toBe(36000);
    expect(row.product.pricing?.streetPriceHuf).toBeUndefined();
    expect(row.componentSkus).toEqual([{ sku: '100010301', quantity: 4 }]);
  });

  it('allows missing product_id in from_sm mode when SM SKU is present', () => {
    const result = parseInventoryRows(
      [
        {
          product_id_SM: '100003301',
          crm_category_slug: 'alutent',
          name_en: 'Test product',
        },
      ],
      { skuMode: 'from_sm' }
    );

    expect(result.errors).toHaveLength(0);
    expect(result.rows[0]!.importedSmSku).toBe('100003301');
  });
});

describe('resolveRowWarehouseKeys', () => {
  it('resolves catalog warehouses from multi-warehouse stock columns', () => {
    const row = {
      crmWarehouseSlugs: undefined,
      warehouses: { 'warehouse 1.': 5, 'warehouse 3.': 2 },
    } as unknown as Parameters<typeof resolveRowWarehouseKeys>[0];
    expect(resolveRowWarehouseKeys(row)).toEqual(['kispest', 'recsei']);
  });
});
