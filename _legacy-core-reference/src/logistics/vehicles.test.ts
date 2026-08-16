import { describe, expect, it } from 'vitest';
import { computeCargoTotals, evaluateVehicleFit } from './vehicles';
import type { IVehicle } from '@crm/db';

const baseVehicle = {
  _id: 'v1',
  name: 'Sprinter',
  plateNumber: 'ABC-123',
  lengthMm: 3000,
  widthMm: 1800,
  heightMm: 1800,
  maxWeightKg: 1000,
  maxVolumeM3: 10,
  isActive: true,
} as unknown as IVehicle;

describe('evaluateVehicleFit', () => {
  it('fits when weight and volume are within limits', () => {
    const totals = computeCargoTotals([
      {
        product: {
          packageWeightKg: 10,
          packageVolumeM3: 0.5,
          dimensionsMm: { length: 100, width: 100, height: 100 },
        },
        quantity: 2,
      },
    ]);
    const result = evaluateVehicleFit(baseVehicle, totals);
    expect(result.fits).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it('rejects when weight exceeds capacity', () => {
    const totals = computeCargoTotals([
      {
        product: { packageWeightKg: 600, dimensionsMm: {} },
        quantity: 2,
      },
    ]);
    const result = evaluateVehicleFit(baseVehicle, totals);
    expect(result.fits).toBe(false);
    expect(result.reasons.some((r) => r.includes('Súly'))).toBe(true);
  });
});
