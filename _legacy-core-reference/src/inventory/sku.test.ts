import { describe, expect, it } from 'vitest';
import { generateInternalSku, deriveSupplierSkuFromCrmSku, deriveSupplierSkuFromSm } from './sku';

describe('generateInternalSku', () => {
  it('pads and prefixes to total length', () => {
    expect(generateInternalSku({ prefix: '6', totalLength: 9 }, '2602000')).toBe('602602000');
  });

  it('normalizes digits and pads', () => {
    expect(generateInternalSku({ prefix: '8', totalLength: 16 }, 'AB-60303008')).toBe(
      '8000000060303008'
    );
  });

  it('builds Alutent-style 9-digit SM from short supplier SKU', () => {
    expect(generateInternalSku({ prefix: '1', totalLength: 9 }, '3301')).toBe('100003301');
    expect(generateInternalSku({ prefix: '1', totalLength: 9 }, '030001')).toBe('100030001');
  });
});

describe('deriveSupplierSkuFromSm', () => {
  const settings = { prefix: '1', totalLength: 9 };

  it('takes supplier SKU length from the end of the SM SKU', () => {
    expect(deriveSupplierSkuFromSm(settings, '100003301', { supplierSkuLength: 4 })).toBe('3301');
    expect(deriveSupplierSkuFromSm(settings, '100030001', { supplierSkuLength: 6 })).toBe('030001');
  });

  it('round-trips with generateInternalSku', () => {
    for (const supplierSku of ['3301', '030001', '2630']) {
      const sm = generateInternalSku(settings, supplierSku);
      expect(deriveSupplierSkuFromSm(settings, sm, { supplierSkuLength: supplierSku.length })).toBe(
        supplierSku
      );
    }
  });

  it('requires supplier SKU length', () => {
    expect(() => deriveSupplierSkuFromSm(settings, '100003301')).toThrow(/hossz/);
  });
});

describe('deriveSupplierSkuFromCrmSku', () => {
  it('delegates to end-slice when supplierSkuLength is set', () => {
    expect(
      deriveSupplierSkuFromCrmSku({ prefix: '1', totalLength: 9 }, '100030001', {
        supplierSkuLength: 6,
      })
    ).toBe('030001');
  });
});
