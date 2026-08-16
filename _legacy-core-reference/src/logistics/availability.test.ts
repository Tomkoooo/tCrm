import { describe, expect, it } from 'vitest';
import type { Types } from 'mongoose';
import { computeBomAvailabilityFromComponents } from './availability';

function oid(hex: string): Types.ObjectId {
  return { toString: () => hex } as Types.ObjectId;
}

describe('computeBomAvailabilityFromComponents', () => {
  const productId = oid('product');
  const compA = oid('compA');
  const compB = oid('compB');

  it('returns own stock when product has no BOM', () => {
    const stock = new Map([[productId.toString(), 12]]);
    const result = computeBomAvailabilityFromComponents(productId, [], stock);
    expect(result.canBuild).toBe(12);
    expect(result.limitingComponents).toHaveLength(0);
  });

  it('calculates buildable qty from limiting component', () => {
    const stock = new Map([
      [compA.toString(), 10],
      [compB.toString(), 100],
    ]);
    const result = computeBomAvailabilityFromComponents(
      productId,
      [
        { productId: compA, quantity: 2 },
        { productId: compB, quantity: 5 },
      ],
      stock
    );
    expect(result.canBuild).toBe(5);
    expect(result.limitingComponents[0]?.productId.toString()).toBe(compA.toString());
  });

  it('returns zero when components are missing from stock map', () => {
    const stock = new Map<string, number>();
    const result = computeBomAvailabilityFromComponents(
      productId,
      [{ productId: compA, quantity: 1 }],
      stock
    );
    expect(result.canBuild).toBe(0);
  });
});
