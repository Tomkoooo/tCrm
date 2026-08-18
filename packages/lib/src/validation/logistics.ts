import { z } from 'zod';

const objectIdSchema = z.string().min(1, 'ID is required');

const positiveQty = z.coerce.number().min(0.000001, 'Quantity must be > 0');

export const movementLineSchema = z.object({
  productId: objectIdSchema,
  quantity: positiveQty,
  fromWarehouseId: z.string().optional(),
  toWarehouseId: z.string().optional(),
  reservationId: z.string().optional(),
  note: z.string().max(2000).optional(),
});

export const createMovementSchema = z
  .object({
    type: z.enum(['grn', 'pick', 'transfer', 'adjustment', 'return']),
    fromWarehouseId: z.string().optional(),
    toWarehouseId: z.string().optional(),
    supplierId: z.string().optional(),
    note: z.string().max(2000).optional(),
    linesJson: z.string().min(1, 'At least one line is required'),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'grn' && !data.toWarehouseId) {
      ctx.addIssue({
        code: 'custom',
        message: 'Destination warehouse is required for GRN',
        path: ['toWarehouseId'],
      });
    }
    if (data.type === 'pick' && !data.fromWarehouseId) {
      ctx.addIssue({
        code: 'custom',
        message: 'Source warehouse is required for pick',
        path: ['fromWarehouseId'],
      });
    }
    if (data.type === 'transfer' && (!data.fromWarehouseId || !data.toWarehouseId)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Source and destination warehouses are required for transfer',
        path: ['fromWarehouseId'],
      });
    }
  });

export const createReservationSchema = z.object({
  productId: objectIdSchema,
  warehouseId: objectIdSchema,
  quantity: positiveQty,
  sourceType: z.enum(['order', 'build', 'manual', 'event']).default('manual'),
  sourceRef: z.string().max(128).optional(),
  note: z.string().max(2000).optional(),
  expiresAt: z.string().optional(),
});

export const releaseReservationSchema = z.object({
  id: objectIdSchema,
  reason: z.enum(['fulfilled', 'cancelled']),
});

export const reservationLineSchema = z.object({
  productId: objectIdSchema,
  quantity: positiveQty,
});

export const createReservationsBatchSchema = z.object({
  warehouseId: objectIdSchema,
  sourceType: z.enum(['order', 'build', 'manual', 'event']).default('manual'),
  sourceRef: z.string().min(1).max(128),
  note: z.string().max(2000).optional(),
  linesJson: z.string().min(1, 'Legalább egy tétel szükséges'),
});

export function parseReservationLinesJson(json: string): z.infer<typeof reservationLineSchema>[] {
  const parsed = JSON.parse(json) as unknown;
  return z.array(reservationLineSchema).parse(parsed);
}

export type CreateMovementInput = z.infer<typeof createMovementSchema>;
export type MovementLineInput = z.infer<typeof movementLineSchema>;
export type CreateReservationInput = z.infer<typeof createReservationSchema>;

export function parseMovementLinesJson(json: string): MovementLineInput[] {
  const parsed = JSON.parse(json) as unknown;
  return z.array(movementLineSchema).parse(parsed);
}
