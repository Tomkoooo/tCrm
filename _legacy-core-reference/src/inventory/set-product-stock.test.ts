import { describe, expect, it } from 'vitest';
import { productStockLevelsSchema } from '@crm/lib/validation';

describe('setProductStockLevel inputs', () => {
  it('validates target quantity cannot be negative', () => {
    const parsed = productStockLevelsSchema.safeParse([
      { warehouseId: '507f1f77bcf86cd799439011', quantity: -5 },
    ]);
    expect(parsed.success).toBe(false);
  });

  it('accepts absolute set quantities per warehouse', () => {
    const parsed = productStockLevelsSchema.safeParse([
      { warehouseId: '507f1f77bcf86cd799439011', quantity: 10 },
      { warehouseId: '507f1f77bcf86cd799439012', quantity: 0 },
    ]);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data[0]!.quantity).toBe(10);
      expect(parsed.data[1]!.quantity).toBe(0);
    }
  });
});
