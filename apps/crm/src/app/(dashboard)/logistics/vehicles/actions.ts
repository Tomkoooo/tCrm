'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@crm/auth';
import { connectDB, Vehicle } from '@crm/db';
import { vehicleSchema } from '@crm/lib/validation';

export type VehicleFormState =
  | { success: false; fieldErrors?: Record<string, string[]>; message?: string }
  | { success: true; message?: string; id?: string };

function zodToFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || 'form';
    fieldErrors[key] = fieldErrors[key] ?? [];
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}

export async function createVehicleAction(
  _prev: VehicleFormState,
  formData: FormData
): Promise<VehicleFormState> {
  await requirePermission('logistics:write');
  await connectDB();

  const parsed = vehicleSchema.safeParse({
    name: formData.get('name'),
    plateNumber: formData.get('plateNumber'),
    lengthMm: formData.get('lengthMm'),
    widthMm: formData.get('widthMm'),
    heightMm: formData.get('heightMm'),
    maxWeightKg: formData.get('maxWeightKg'),
    maxVolumeM3: formData.get('maxVolumeM3'),
    isActive: formData.get('isActive') === 'on' || formData.get('isActive') === 'true',
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  const vehicle = await Vehicle.create(parsed.data);
  revalidatePath('/logistics/vehicles');
  return { success: true, message: 'Jármű létrehozva.', id: vehicle._id.toString() };
}

export async function updateVehicleAction(
  id: string,
  _prev: VehicleFormState,
  formData: FormData
): Promise<VehicleFormState> {
  await requirePermission('logistics:write');
  await connectDB();

  const parsed = vehicleSchema.safeParse({
    name: formData.get('name'),
    plateNumber: formData.get('plateNumber'),
    lengthMm: formData.get('lengthMm'),
    widthMm: formData.get('widthMm'),
    heightMm: formData.get('heightMm'),
    maxWeightKg: formData.get('maxWeightKg'),
    maxVolumeM3: formData.get('maxVolumeM3'),
    isActive: formData.get('isActive') === 'on' || formData.get('isActive') === 'true',
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  const vehicle = await Vehicle.findById(id);
  if (!vehicle) return { success: false, message: 'Jármű nem található.' };

  vehicle.set(parsed.data);
  await vehicle.save();

  revalidatePath('/logistics/vehicles');
  return { success: true, message: 'Jármű mentve.' };
}

export async function deleteVehicleAction(id: string): Promise<VehicleFormState> {
  await requirePermission('logistics:write');
  await connectDB();

  const vehicle = await Vehicle.findByIdAndDelete(id);
  if (!vehicle) return { success: false, message: 'Jármű nem található.' };

  revalidatePath('/logistics/vehicles');
  return { success: true, message: 'Jármű törölve.' };
}
