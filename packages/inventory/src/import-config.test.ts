import { describe, expect, it } from 'vitest';
import {
  buildAutoColumnMap,
  detectImportGaps,
  normalizeImportSlug,
  preprocessImportRows,
} from './import-config';

describe('normalizeImportSlug', () => {
  it('lowercases uppercase category codes', () => {
    expect(normalizeImportSlug('ALUTENT')).toBe('alutent');
  });
});

describe('preprocessImportRows', () => {
  it('applies column map from source headers to canonical fields', () => {
    const [row] = preprocessImportRows(
      [
        {
          SupplierSKU: '3301',
          Category: 'alutent',
          name_en: 'Test product',
        },
      ],
      {
        columnMap: {
          product_id: 'SupplierSKU',
          crm_category_slug: 'Category',
        },
      }
    );

    expect(row['product_id']).toBe('3301');
    expect(row['crm_category_slug']).toBe('alutent');
    expect(row['name_en']).toBe('Test product');
  });

  it('normalizes uppercase category slug from mapped column', () => {
    const [row] = preprocessImportRows([{ brand: 'ALUTENT', product_id_SM: '100003301' }], {
      columnMap: { crm_category_slug: 'brand', product_id_SM: 'product_id_SM' },
    });

    expect(row['crm_category_slug']).toBe('alutent');
  });

  it('falls back brand to crm_category_slug when category column missing', () => {
    const [row] = preprocessImportRows([{ brand: 'ALUTENT', product_id: '3301' }], {});

    expect(row['crm_category_slug']).toBe('alutent');
  });
});

describe('buildAutoColumnMap', () => {
  it('maps headers that match canonical column names', () => {
    const map = buildAutoColumnMap(['product_id', 'crm_category_slug', 'extra']);
    expect(map.product_id).toBe('product_id');
    expect(map.crm_category_slug).toBe('crm_category_slug');
    expect(map.brand).toBeUndefined();
  });

  it('matches headers case-insensitively', () => {
    const map = buildAutoColumnMap(['PRODUCT_ID', 'CRM_CATEGORY_SLUG']);
    expect(map.product_id).toBe('PRODUCT_ID');
    expect(map.crm_category_slug).toBe('CRM_CATEGORY_SLUG');
  });
});

describe('detectImportGaps', () => {
  it('reports missing required fields only', () => {
    expect(detectImportGaps(['product_id', 'name_en'], { product_id: 'product_id' })).toEqual([
      'crm_category_slug',
    ]);
  });

  it('does not require warehouse columns', () => {
    expect(
      detectImportGaps(['product_id', 'crm_category_slug'], {
        product_id: 'product_id',
        crm_category_slug: 'crm_category_slug',
      })
    ).toEqual([]);
  });

  it('requires product_id_SM in from_sm mode', () => {
    expect(
      detectImportGaps(
        ['product_id', 'crm_category_slug'],
        { crm_category_slug: 'crm_category_slug' },
        { skuMode: 'from_sm' }
      )
    ).toEqual(['product_id_SM']);
  });

  it('accepts mapped brand as category via column map', () => {
    expect(
      detectImportGaps(['product_id', 'brand'], {
        product_id: 'product_id',
        crm_category_slug: 'brand',
      })
    ).toEqual([]);
  });
});
