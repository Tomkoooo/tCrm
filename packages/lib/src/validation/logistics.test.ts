import { describe, expect, it } from 'vitest';
import { createMovementSchema, createReservationSchema, parseMovementLinesJson } from './logistics';

describe('logistics validation', () => {
  it('validates GRN requires destination warehouse', () => {
    const result = createMovementSchema.safeParse({
      type: 'grn',
      linesJson: JSON.stringify([{ productId: 'abc', quantity: 1 }]),
    });
    expect(result.success).toBe(false);
  });

  it('validates reservation input', () => {
    const result = createReservationSchema.safeParse({
      productId: '507f1f77bcf86cd799439011',
      warehouseId: '507f1f77bcf86cd799439012',
      quantity: 5,
      sourceType: 'manual',
    });
    expect(result.success).toBe(true);
  });

  it('parses movement lines JSON', () => {
    const lines = parseMovementLinesJson(
      JSON.stringify([{ productId: '507f1f77bcf86cd799439011', quantity: 2 }])
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]?.quantity).toBe(2);
  });
});
