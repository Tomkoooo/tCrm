'use server';

import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import { requireAuth, requirePermission } from '@crm/auth';
import {
  cancelMovement,
  confirmMovement,
  createMovement,
  createReservation,
  releaseReservation,
} from '@crm/core';
import {
  createMovementSchema,
  createReservationSchema,
  parseMovementLinesJson,
} from '@crm/lib/validation';

export type LogisticsFormState =
  | { success: false; fieldErrors?: Record<string, string[]>; message?: string }
  | { success: true; message?: string; id?: string };

async function logisticsActorId(): Promise<string> {
  const user = await requirePermission('logistics:write');
  if (!user?.id) {
    throw new Error('Unauthorized');
  }
  return user.id;
}

function zodToFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || 'form';
    fieldErrors[key] = fieldErrors[key] ?? [];
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}

export async function createMovementAction(
  _prev: LogisticsFormState,
  formData: FormData
): Promise<LogisticsFormState> {
  const userId = await logisticsActorId();

  const parsed = createMovementSchema.safeParse({
    type: formData.get('type'),
    fromWarehouseId: formData.get('fromWarehouseId') || undefined,
    toWarehouseId: formData.get('toWarehouseId') || undefined,
    supplierId: formData.get('supplierId') || undefined,
    note: formData.get('note') || undefined,
    linesJson: formData.get('linesJson'),
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  let lines;
  try {
    lines = parseMovementLinesJson(parsed.data.linesJson);
  } catch {
    return { success: false, message: 'Invalid movement lines' };
  }

  try {
    const movement = await createMovement({
      type: parsed.data.type,
      fromWarehouseId: parsed.data.fromWarehouseId
        ? new mongoose.Types.ObjectId(parsed.data.fromWarehouseId)
        : undefined,
      toWarehouseId: parsed.data.toWarehouseId
        ? new mongoose.Types.ObjectId(parsed.data.toWarehouseId)
        : undefined,
      supplierId: parsed.data.supplierId
        ? new mongoose.Types.ObjectId(parsed.data.supplierId)
        : undefined,
      note: parsed.data.note,
      lines: lines.map((line) => ({
        productId: new mongoose.Types.ObjectId(line.productId),
        quantity: line.quantity,
        fromWarehouseId: line.fromWarehouseId
          ? new mongoose.Types.ObjectId(line.fromWarehouseId)
          : undefined,
        toWarehouseId: line.toWarehouseId
          ? new mongoose.Types.ObjectId(line.toWarehouseId)
          : undefined,
        reservationId: line.reservationId
          ? new mongoose.Types.ObjectId(line.reservationId)
          : undefined,
        note: line.note,
      })),
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    revalidatePath('/logistics');
    revalidatePath('/logistics/movements');
    return {
      success: true,
      message: `Draft ${movement.reference} created`,
      id: movement._id.toString(),
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Failed to create movement',
    };
  }
}

export async function confirmMovementAction(id: string): Promise<LogisticsFormState> {
  const userId = await logisticsActorId();

  try {
    await confirmMovement(new mongoose.Types.ObjectId(id), new mongoose.Types.ObjectId(userId));
    revalidatePath('/logistics');
    revalidatePath('/logistics/movements');
    revalidatePath(`/logistics/movements/${id}`);
    revalidatePath('/inventory');
    return { success: true, message: 'Movement confirmed' };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Failed to confirm movement',
    };
  }
}

export async function cancelMovementAction(id: string): Promise<LogisticsFormState> {
  const userId = await logisticsActorId();

  try {
    await cancelMovement(new mongoose.Types.ObjectId(id), new mongoose.Types.ObjectId(userId));
    revalidatePath('/logistics');
    revalidatePath('/logistics/movements');
    revalidatePath(`/logistics/movements/${id}`);
    return { success: true, message: 'Movement cancelled' };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Failed to cancel movement',
    };
  }
}

export async function createReservationAction(
  _prev: LogisticsFormState,
  formData: FormData
): Promise<LogisticsFormState> {
  const userId = await logisticsActorId();

  const parsed = createReservationSchema.safeParse({
    productId: formData.get('productId'),
    warehouseId: formData.get('warehouseId'),
    quantity: formData.get('quantity'),
    sourceType: formData.get('sourceType') || 'manual',
    sourceRef: formData.get('sourceRef') || undefined,
    note: formData.get('note') || undefined,
    expiresAt: formData.get('expiresAt') || undefined,
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  try {
    const reservation = await createReservation({
      productId: new mongoose.Types.ObjectId(parsed.data.productId),
      warehouseId: new mongoose.Types.ObjectId(parsed.data.warehouseId),
      quantity: parsed.data.quantity,
      sourceType: parsed.data.sourceType,
      sourceRef: parsed.data.sourceRef,
      note: parsed.data.note,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    revalidatePath('/logistics');
    revalidatePath('/logistics/reservations');
    return { success: true, message: 'Reservation created', id: reservation._id.toString() };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Failed to create reservation',
    };
  }
}

export async function releaseReservationAction(
  id: string,
  reason: 'fulfilled' | 'cancelled'
): Promise<LogisticsFormState> {
  const userId = await logisticsActorId();

  try {
    await releaseReservation(
      new mongoose.Types.ObjectId(id),
      reason,
      new mongoose.Types.ObjectId(userId)
    );
    revalidatePath('/logistics');
    revalidatePath('/logistics/reservations');
    return { success: true, message: `Reservation ${reason}` };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Failed to release reservation',
    };
  }
}

export async function requireLogisticsRead() {
  await requirePermission('logistics:read');
}

export async function requireLogisticsWrite() {
  await requirePermission('logistics:write');
}

export async function getLogisticsActor() {
  return requireAuth();
}
