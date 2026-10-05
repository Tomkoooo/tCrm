import { describe, expect, it } from 'vitest';
import {
  generateInternalSku,
  deriveSupplierSkuFromCrmSku,
  deriveSupplierSkuFromSm,
  formatSequentialSku,
  normalizeSkuChars,
  skuSettingsFromCategory,
  QUICK_SKU_FALLBACK,
} from './sku';

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

  it('collapses variant letters onto one SKU by default', () => {
    const settings = { prefix: '9', totalLength: 9, padChar: '0' };
    expect(generateInternalSku(settings, '6030649A')).toBe(
      generateInternalSku(settings, '6030649B')
    );
  });

  it('keeps variant letters distinct with preserveLetters', () => {
    const settings = { prefix: '9', totalLength: 9, padChar: '0' };
    expect(generateInternalSku(settings, '6030649A', { preserveLetters: true })).toBe('96030649A');
    expect(generateInternalSku(settings, '6030649B', { preserveLetters: true })).toBe('96030649B');
  });

  it('leaves digit-only supplier SKUs byte-identical under preserveLetters', () => {
    const settings = { prefix: '9', totalLength: 9, padChar: '0' };
    for (const supplierSku of ['60210010', '60302350', '3301', '030001']) {
      expect(generateInternalSku(settings, supplierSku, { preserveLetters: true })).toBe(
        generateInternalSku(settings, supplierSku)
      );
    }
  });
});

describe('normalizeSkuChars', () => {
  it('uppercases and strips separators but keeps letters', () => {
    expect(normalizeSkuChars('6030649a')).toBe('6030649A');
    expect(normalizeSkuChars('ab-60303008')).toBe('AB60303008');
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

  it('round-trips alphanumeric supplier SKUs with preserveLetters', () => {
    const traverz = { prefix: '9', totalLength: 9, padChar: '0' };
    for (const supplierSku of ['6030649A', '6030649B']) {
      const sm = generateInternalSku(traverz, supplierSku, { preserveLetters: true });
      expect(
        deriveSupplierSkuFromSm(traverz, sm, {
          supplierSkuLength: supplierSku.length,
          preserveLetters: true,
        })
      ).toBe(supplierSku);
    }
  });

  it('requires supplier SKU length', () => {
    expect(() => deriveSupplierSkuFromSm(settings, '100003301')).toThrow(/hossz/);
  });
});

describe('skuSettingsFromCategory', () => {
  it('falls back to Q prefix when category has no skuPrefix', () => {
    expect(skuSettingsFromCategory({})).toEqual(QUICK_SKU_FALLBACK);
    expect(skuSettingsFromCategory(null)).toEqual(QUICK_SKU_FALLBACK);
  });

  it('uses category prefix and pads total length when missing', () => {
    expect(skuSettingsFromCategory({ skuPrefix: '1' })).toEqual({
      prefix: '1',
      totalLength: 7,
      padChar: undefined,
    });
  });

  it('keeps an explicit total length', () => {
    expect(skuSettingsFromCategory({ skuPrefix: '1', skuTotalLength: 9 })).toEqual({
      prefix: '1',
      totalLength: 9,
      padChar: undefined,
    });
  });
});

describe('formatSequentialSku', () => {
  it('pads Alutent-style numeric SKUs', () => {
    expect(formatSequentialSku({ prefix: '1', totalLength: 9 }, 1)).toBe('100000001');
    expect(formatSequentialSku({ prefix: '1', totalLength: 9 }, 3301)).toBe('100003301');
  });

  it('builds Q-prefix SKUs for categories without a prefix', () => {
    expect(formatSequentialSku(QUICK_SKU_FALLBACK, 1)).toBe('Q0000001');
    expect(formatSequentialSku(QUICK_SKU_FALLBACK, 42)).toBe('Q0000042');
  });

  it('rejects a sequence that no longer fits the digit budget', () => {
    expect(() => formatSequentialSku({ prefix: '1', totalLength: 3 }, 100)).toThrow(/betelt/);
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
