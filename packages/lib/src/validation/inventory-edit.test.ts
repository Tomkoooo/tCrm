import { describe, expect, it } from 'vitest';
import {
  productComponentsSchema,
  productSchema,
  productStockLevelsSchema,
  quickProductSchema,
} from './inventory';

describe('productSchema components', () => {
  it('rejects mongoose BOM lines (productId only)', () => {
    const result = productSchema.safeParse({
      sku: 'PARENT-1',
      names: { hu: 'Parent' },
      components: [{ productId: '507f1f77bcf86cd799439011', quantity: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts product payload without embedded components', () => {
    const result = productSchema.safeParse({
      sku: 'PARENT-1',
      names: { hu: 'Parent' },
    });
    expect(result.success).toBe(true);
  });
});

describe('productComponentsSchema', () => {
  it('accepts empty BOM', () => {
    expect(productComponentsSchema.safeParse([]).success).toBe(true);
  });

  it('rejects duplicate component ids', () => {
    const result = productComponentsSchema.safeParse([
      { productId: 'a', quantity: 1 },
      { productId: 'a', quantity: 2 },
    ]);
    expect(result.success).toBe(false);
  });

  it('rejects non-positive quantity', () => {
    const result = productComponentsSchema.safeParse([{ productId: 'a', quantity: 0 }]);
    expect(result.success).toBe(false);
  });
});

describe('productStockLevelsSchema', () => {
  it('accepts zero stock', () => {
    expect(productStockLevelsSchema.safeParse([{ warehouseId: 'wh1', quantity: 0 }]).success).toBe(
      true
    );
  });

  it('rejects negative stock', () => {
    expect(productStockLevelsSchema.safeParse([{ warehouseId: 'wh1', quantity: -1 }]).success).toBe(
      false
    );
  });
});

describe('quickProductSchema', () => {
  it('requires Hungarian name and category', () => {
    expect(quickProductSchema.safeParse({ nameHu: '', categorySlug: 'sator' }).success).toBe(false);
    expect(quickProductSchema.safeParse({ nameHu: 'Sátor', categorySlug: '' }).success).toBe(false);
    expect(quickProductSchema.safeParse({ nameHu: 'Sátor', categorySlug: 'sator' }).success).toBe(
      true
    );
  });

  it('treats empty quantity as unset', () => {
    const parsed = quickProductSchema.safeParse({
      nameHu: 'Sátor',
      categorySlug: 'sator',
      quantity: '',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.quantity).toBeUndefined();
  });
});
