import { describe, expect, it } from 'vitest';
import { groupCheckInDestinations, warehousePickQuantity } from './check-in';

describe('warehousePickQuantity', () => {
  it('skips qty already on the truck from a previous event', () => {
    expect(warehousePickQuantity(10, 4)).toBe(6);
    expect(warehousePickQuantity(4, 4)).toBe(0);
    expect(warehousePickQuantity(3, 5)).toBe(0);
  });
});

describe('groupCheckInDestinations', () => {
  it('defaults returns to the origin warehouse', () => {
    const result = groupCheckInDestinations([{ productId: 'p1', checkedQuantity: 2 }], 'origin-wh');
    expect(result.warehouseReturns).toEqual([
      { warehouseId: 'origin-wh', lines: [{ productId: 'p1', quantity: 2 }] },
    ]);
    expect(result.jobHandoffs).toEqual([]);
  });

  it('splits lines across warehouses and the next job', () => {
    const result = groupCheckInDestinations(
      [
        { productId: 'p1', checkedQuantity: 3, warehouseId: 'recsei' },
        { productId: 'p2', checkedQuantity: 1, destinationKind: 'job', jobId: 'job-2' },
        { productId: 'p3', checkedQuantity: 0 },
      ],
      'kispest'
    );
    expect(result.warehouseReturns).toEqual([
      { warehouseId: 'recsei', lines: [{ productId: 'p1', quantity: 3 }] },
    ]);
    expect(result.jobHandoffs).toEqual([
      { jobId: 'job-2', lines: [{ productId: 'p2', quantity: 1 }] },
    ]);
  });

  it('rejects a job handoff without a target', () => {
    expect(() =>
      groupCheckInDestinations(
        [{ productId: 'p1', checkedQuantity: 1, destinationKind: 'job' }],
        'wh'
      )
    ).toThrow(/esemény/);
  });
});
