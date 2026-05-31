import { describe, expect, it } from 'vitest';
import { productComponentsSchema, productStockLevelsSchema } from './inventory';

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
