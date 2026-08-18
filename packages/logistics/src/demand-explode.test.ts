import { describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { explodeDemandLines } from './demand-explode';

const oid = (n: number) => new mongoose.Types.ObjectId(String(n).padStart(24, '0'));

describe('explodeDemandLines', () => {
  it('keeps catalog SKUs that have no job-local kit', () => {
    const parent = oid(1);
    const result = explodeDemandLines(
      [{ productId: parent, requestedQuantity: 3 }],
      new Map([[String(parent), { _id: parent, components: [{ productId: oid(2), quantity: 4 }] }]])
    );
    expect(result).toEqual([{ productId: parent, requestedQuantity: 3, isOptional: undefined }]);
  });

  it('explodes a job-local kit and multiplies by requested quantity', () => {
    const pipe2m = oid(2);
    const socket = oid(3);
    const result = explodeDemandLines(
      [
        {
          productId: oid(1),
          requestedQuantity: 2,
          kit: {
            substitutionNote: '4 m helyett 2×2 m + toldó',
            components: [
              { productId: pipe2m, quantity: 2 },
              { productId: socket, quantity: 1 },
            ],
          },
        },
      ],
      new Map()
    );
    expect(result).toEqual([
      { productId: pipe2m, requestedQuantity: 4, isOptional: undefined },
      { productId: socket, requestedQuantity: 2, isOptional: undefined },
    ]);
  });

  it('merges identical exploded components', () => {
    const pipe = oid(2);
    const result = explodeDemandLines(
      [
        {
          kit: { components: [{ productId: pipe, quantity: 2 }] },
          requestedQuantity: 1,
        },
        {
          kit: { components: [{ productId: pipe, quantity: 1 }] },
          requestedQuantity: 3,
        },
      ],
      new Map()
    );
    expect(result).toEqual([{ productId: pipe, requestedQuantity: 5, isOptional: undefined }]);
  });
});
