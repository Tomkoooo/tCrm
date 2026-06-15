'use server';

import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import { requireAnyPermission, requirePermission } from '@crm/auth';
import {
  canUserReportVehicleIncident,
  createVehicleIncident,
  markVehicleIncidentFixed,
  syncVehicleMedia,
} from '@crm/core';
import { connectDB, Vehicle, VehicleIncident } from '@crm/db';
import {
  LOGISTICS_VEHICLES_READ_PERMISSION_KEYS,
  LOGISTICS_VEHICLES_REPORT_PERMISSION_KEYS,
  hasAnyPermission,
} from '@crm/lib';
import { parseMediaIdsFromForm, vehicleIncidentSchema, vehicleSchema } from '@crm/lib/validation';

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

function parseVehicleCandidate(formData: FormData) {
  return {
    name: formData.get('name'),
    plateNumber: formData.get('plateNumber'),
    lengthMm: formData.get('lengthMm'),
    widthMm: formData.get('widthMm'),
    heightMm: formData.get('heightMm'),
    maxWeightKg: formData.get('maxWeightKg'),
    maxVolumeM3: formData.get('maxVolumeM3'),
    isActive: formData.get('isActive') === 'on' || formData.get('isActive') === 'true',
    companyId: formData.get('companyId') || '',
    registrationDueDate: formData.get('registrationDueDate') || '',
    insuranceDueDate: formData.get('insuranceDueDate') || '',
    licenseFileId: formData.get('licenseFileId') || '',
    registrationFileId: formData.get('registrationFileId') || '',
    insuranceFileId: formData.get('insuranceFileId') || '',
  };
}

function toOptionalObjectId(value: string | undefined): mongoose.Types.ObjectId | undefined {
  if (!value?.trim() || !mongoose.Types.ObjectId.isValid(value)) return undefined;
  return new mongoose.Types.ObjectId(value);
}

function vehiclePayloadFromParsed(
  parsed: ReturnType<typeof vehicleSchema.parse>,
  formData: FormData
) {
  const imageIds = parseMediaIdsFromForm(formData, 'imageId');

  return {
    ...parsed,
    companyId: toOptionalObjectId(parsed.companyId),
    licenseFileId: toOptionalObjectId(parsed.licenseFileId),
    registrationFileId: toOptionalObjectId(parsed.registrationFileId),
    insuranceFileId: toOptionalObjectId(parsed.insuranceFileId),
    imageIds: imageIds.map((id) => new mongoose.Types.ObjectId(id)),
  };
}

export async function createVehicleAction(
  _prev: VehicleFormState,
  formData: FormData
): Promise<VehicleFormState> {
  await requirePermission('logistics:write');
  await connectDB();

  const parsed = vehicleSchema.safeParse(parseVehicleCandidate(formData));
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  const payload = vehiclePayloadFromParsed(parsed.data, formData);
  const vehicle = await Vehicle.create(payload);

  await syncVehicleMedia({
    vehicleId: vehicle._id,
    previous: {
      imageIds: [],
      licenseFileId: undefined,
      registrationFileId: undefined,
      insuranceFileId: undefined,
    },
    nextImageIds: payload.imageIds,
    nextLicenseFileId: payload.licenseFileId,
    nextRegistrationFileId: payload.registrationFileId,
    nextInsuranceFileId: payload.insuranceFileId,
  });

  revalidatePath('/logistics/vehicles');
  revalidatePath('/logistics');
  return { success: true, message: 'Jármű létrehozva.', id: vehicle._id.toString() };
}

export async function updateVehicleAction(
  id: string,
  _prev: VehicleFormState,
  formData: FormData
): Promise<VehicleFormState> {
  await requirePermission('logistics:write');
  await connectDB();

  const parsed = vehicleSchema.safeParse(parseVehicleCandidate(formData));
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  const vehicle = await Vehicle.findById(id);
  if (!vehicle) return { success: false, message: 'Jármű nem található.' };

  const previous = {
    imageIds: [...(vehicle.imageIds ?? [])],
    licenseFileId: vehicle.licenseFileId,
    registrationFileId: vehicle.registrationFileId,
    insuranceFileId: vehicle.insuranceFileId,
  };

  const payload = vehiclePayloadFromParsed(parsed.data, formData);
  vehicle.set({
    name: payload.name,
    plateNumber: payload.plateNumber,
    lengthMm: payload.lengthMm,
    widthMm: payload.widthMm,
    heightMm: payload.heightMm,
    maxWeightKg: payload.maxWeightKg,
    maxVolumeM3: payload.maxVolumeM3,
    isActive: payload.isActive,
    companyId: payload.companyId,
    registrationDueDate: payload.registrationDueDate,
    insuranceDueDate: payload.insuranceDueDate,
    licenseFileId: payload.licenseFileId,
    registrationFileId: payload.registrationFileId,
    insuranceFileId: payload.insuranceFileId,
    imageIds: payload.imageIds,
  });
  await vehicle.save();

  await syncVehicleMedia({
    vehicleId: vehicle._id,
    previous,
    nextImageIds: payload.imageIds,
    nextLicenseFileId: payload.licenseFileId,
    nextRegistrationFileId: payload.registrationFileId,
    nextInsuranceFileId: payload.insuranceFileId,
  });

  revalidatePath('/logistics/vehicles');
  revalidatePath(`/logistics/vehicles/${id}`);
  revalidatePath('/logistics');
  return { success: true, message: 'Jármű mentve.' };
}

export async function deleteVehicleAction(id: string): Promise<VehicleFormState> {
  await requirePermission('logistics:write');
  await connectDB();

  const vehicle = await Vehicle.findByIdAndDelete(id);
  if (!vehicle) return { success: false, message: 'Jármű nem található.' };

  revalidatePath('/logistics/vehicles');
  revalidatePath('/logistics');
  return { success: true, message: 'Jármű törölve.' };
}

export async function reportVehicleIncidentAction(
  vehicleId: string,
  _prev: VehicleFormState,
  formData: FormData
): Promise<VehicleFormState> {
  const user = await requireAnyPermission([...LOGISTICS_VEHICLES_REPORT_PERMISSION_KEYS]);

  if (!hasAnyPermission(user.permissions, LOGISTICS_VEHICLES_READ_PERMISSION_KEYS)) {
    return { success: false, message: 'Nincs jogosultság a jármű megtekintéséhez.' };
  }

  if (!canUserReportVehicleIncident(user.permissions)) {
    return { success: false, message: 'Nincs jogosultság incidens bejelentésére.' };
  }

  await connectDB();
  const vehicle = await Vehicle.findById(vehicleId).exec();
  if (!vehicle) return { success: false, message: 'Jármű nem található.' };

  const parsed = vehicleIncidentSchema.safeParse({
    description: formData.get('description'),
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  const photoIds = parseMediaIdsFromForm(formData, 'incidentPhotoId');
  await createVehicleIncident({
    vehicleId,
    reportedById: user.id,
    description: parsed.data.description,
    photoIds,
  });

  revalidatePath(`/logistics/vehicles/${vehicleId}`);
  revalidatePath('/logistics');
  return { success: true, message: 'Incidens bejelentve.' };
}

export async function markVehicleIncidentFixedAction(
  vehicleId: string,
  incidentId: string
): Promise<VehicleFormState> {
  const user = await requirePermission('logistics:write');
  await connectDB();

  const incident = await VehicleIncident.findOne({
    _id: incidentId,
    vehicleId,
  }).exec();
  if (!incident) return { success: false, message: 'Incidens nem található.' };

  await markVehicleIncidentFixed({
    incidentId,
    fixedById: user.id,
  });

  revalidatePath(`/logistics/vehicles/${vehicleId}`);
  revalidatePath('/logistics');
  return { success: true, message: 'Incidens lezárva.' };
}
