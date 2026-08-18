import { describe, expect, it } from 'vitest';
import {
  proposePickupRounds,
  type OptimizerDemandLine,
  type OptimizerVehicle,
} from './optimize-pickups';

const line = (
  id: string,
  qty: number,
  extra?: Partial<OptimizerDemandLine>
): OptimizerDemandLine => ({
  productId: id,
  requestedQuantity: qty,
  weightKg: 10,
  volumeM3: 0.1,
  lengthMm: 400,
  widthMm: 300,
  heightMm: 200,
  ...extra,
});

const van = (id: string, booked = false): OptimizerVehicle => ({
  vehicleId: id,
  maxWeightKg: 800,
  maxVolumeM3: 8,
  lengthMm: 2000,
  widthMm: 1200,
  heightMm: 1200,
  booked,
});

describe('proposePickupRounds', () => {
  it('groups stock by warehouse and picks an unbooked van', () => {
    const result = proposePickupRounds(
      [line('p1', 4), line('p2', 2)],
      [
        { productId: 'p1', warehouseId: 'wh-a', available: 10 },
        { productId: 'p2', warehouseId: 'wh-a', available: 5 },
      ],
      [van('v1')]
    );
    expect(result.rounds).toHaveLength(1);
    expect(result.rounds[0]?.warehouseId).toBe('wh-a');
    expect(result.rounds[0]?.vehicleId).toBe('v1');
    expect(result.rounds[0]?.vehicleWarning).toBeUndefined();
    expect(result.shortages).toHaveLength(0);
  });

  it('splits a line across warehouses when one site cannot cover it', () => {
    const result = proposePickupRounds(
      [line('p1', 10)],
      [
        { productId: 'p1', warehouseId: 'wh-a', available: 6 },
        { productId: 'p1', warehouseId: 'wh-b', available: 8 },
      ],
      [van('v1')]
    );
    expect(result.rounds).toHaveLength(2);
    const qtyA = result.rounds.find((r) => r.warehouseId === 'wh-a')?.lines[0]?.requestedQuantity;
    const qtyB = result.rounds.find((r) => r.warehouseId === 'wh-b')?.lines[0]?.requestedQuantity;
    expect((qtyA ?? 0) + (qtyB ?? 0)).toBe(10);
    expect(qtyB).toBe(8);
    expect(qtyA).toBe(2);
  });

  it('flags a booked vehicle instead of failing the plan', () => {
    const result = proposePickupRounds(
      [line('p1', 1)],
      [{ productId: 'p1', warehouseId: 'wh-a', available: 5 }],
      [van('v-busy', true)]
    );
    expect(result.rounds).toHaveLength(1);
    expect(result.rounds[0]?.vehicleId).toBe('v-busy');
    expect(result.rounds[0]?.vehicleWarning).toMatch(/foglalt/i);
  });

  it('records shortages when stock is missing', () => {
    const result = proposePickupRounds(
      [line('p1', 10)],
      [{ productId: 'p1', warehouseId: 'wh-a', available: 3 }],
      [van('v1')]
    );
    expect(result.shortages[0]).toEqual({ productId: 'p1', requested: 10, allocated: 3 });
  });

  it('prefers unbooked vans over booked ones', () => {
    const result = proposePickupRounds(
      [line('p1', 1)],
      [{ productId: 'p1', warehouseId: 'wh-a', available: 5 }],
      [van('busy', true), van('free')]
    );
    expect(result.rounds[0]?.vehicleId).toBe('free');
    expect(result.rounds[0]?.vehicleWarning).toBeUndefined();
  });
});
