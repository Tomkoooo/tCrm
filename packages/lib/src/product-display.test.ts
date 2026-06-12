import { describe, expect, it } from 'vitest';
import { formatProductSkuLine, productDisplayName } from './product-display';

describe('productDisplayName', () => {
  it('prefers Hungarian name', () => {
    expect(productDisplayName({ hu: 'Sátor', en: 'Tent' }, '1001')).toBe('Sátor');
  });

  it('falls back to sku', () => {
    expect(productDisplayName({}, '1001')).toBe('1001');
  });
});

describe('formatProductSkuLine', () => {
  it('combines name and sku', () => {
    expect(formatProductSkuLine('Sátor', '100003301')).toBe('Sátor · 100003301');
  });

  it('returns sku only when name matches', () => {
    expect(formatProductSkuLine('100003301', '100003301')).toBe('100003301');
  });
});
