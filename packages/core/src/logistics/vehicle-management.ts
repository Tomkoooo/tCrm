import mongoose, { type Types } from 'mongoose';
import {
  connectDB,
  User,
  Vehicle,
  VehicleIncident,
  type IVehicle,
  type IVehicleIncident,
} from '@crm/db';
import { syncMediaUsage } from '../inventory/media';

export type VehicleComplianceWarning = {
  vehicleId: string;
  vehicleName: string;
  plateNumber: string;
  kind: 'registration' | 'insurance';
  dueDate: string;
  daysUntilDue: number;
  isOverdue: boolean;
};

export type VehicleIncidentListItem = {
  id: string;
  description: string;
  status: 'reported' | 'fixed';
  reportedByName: string;
  fixedByName?: string;
  photoIds: string[];
  createdAt: string;
  fixedAt?: string;
};

function toObjectId(id: Types.ObjectId | string): mongoose.Types.ObjectId {
  return typeof id === 'string'
    ? new mongoose.Types.ObjectId(id)
    : new mongoose.Types.ObjectId(id.toString());
}

function daysUntil(date: Date, from = new Date()): number {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export async function getVehicleComplianceWarnings(
  withinDays = 30
): Promise<VehicleComplianceWarning[]> {
  await connectDB();
  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + withinDays);

  const vehicles = await Vehicle.find({
    isActive: true,
    $or: [{ registrationDueDate: { $lte: horizon } }, { insuranceDueDate: { $lte: horizon } }],
  })
    .select('name plateNumber registrationDueDate insuranceDueDate')
    .lean()
    .exec();

  const warnings: VehicleComplianceWarning[] = [];

  for (const vehicle of vehicles) {
    if (vehicle.registrationDueDate) {
      const days = daysUntil(vehicle.registrationDueDate, now);
      if (days <= withinDays) {
        warnings.push({
          vehicleId: String(vehicle._id),
          vehicleName: vehicle.name,
          plateNumber: vehicle.plateNumber,
          kind: 'registration',
          dueDate: vehicle.registrationDueDate.toISOString(),
          daysUntilDue: days,
          isOverdue: days < 0,
        });
      }
    }
    if (vehicle.insuranceDueDate) {
      const days = daysUntil(vehicle.insuranceDueDate, now);
      if (days <= withinDays) {
        warnings.push({
          vehicleId: String(vehicle._id),
          vehicleName: vehicle.name,
          plateNumber: vehicle.plateNumber,
          kind: 'insurance',
          dueDate: vehicle.insuranceDueDate.toISOString(),
          daysUntilDue: days,
          isOverdue: days < 0,
        });
      }
    }
  }

  return warnings.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

export async function canUserReportVehicleIncident(
  vehicle: Pick<IVehicle, 'allowedUserIds' | 'allowedRoleIds'>,
  userId: string,
  userRoleIds: Types.ObjectId[]
): Promise<boolean> {
  const uid = userId.toString();
  if (vehicle.allowedUserIds.some((id) => id.toString() === uid)) {
    return true;
  }
  const allowedRoleSet = new Set(vehicle.allowedRoleIds.map((id) => id.toString()));
  return userRoleIds.some((roleId) => allowedRoleSet.has(roleId.toString()));
}

async function syncVehicleMediaField(opts: {
  vehicleId: Types.ObjectId | string;
  fieldName: string;
  previousMediaId?: Types.ObjectId | string | null;
  nextMediaId?: Types.ObjectId | string | null;
}): Promise<void> {
  const prev = opts.previousMediaId ? [opts.previousMediaId] : [];
  const next = opts.nextMediaId ? [opts.nextMediaId] : [];
  await syncMediaUsage({
    entityType: 'vehicle',
    entityId: opts.vehicleId,
    fieldName: opts.fieldName,
    previousMediaIds: prev,
    nextMediaIds: next,
  });
}

export async function syncVehicleMedia(opts: {
  vehicleId: Types.ObjectId | string;
  previous: Pick<IVehicle, 'imageIds' | 'licenseFileId' | 'registrationFileId' | 'insuranceFileId'>;
  nextImageIds: Array<Types.ObjectId | string>;
  nextLicenseFileId?: Types.ObjectId | string | null;
  nextRegistrationFileId?: Types.ObjectId | string | null;
  nextInsuranceFileId?: Types.ObjectId | string | null;
}): Promise<void> {
  await syncMediaUsage({
    entityType: 'vehicle',
    entityId: opts.vehicleId,
    fieldName: 'imageIds',
    previousMediaIds: opts.previous.imageIds ?? [],
    nextMediaIds: opts.nextImageIds,
  });

  await syncVehicleMediaField({
    vehicleId: opts.vehicleId,
    fieldName: 'licenseFileId',
    previousMediaId: opts.previous.licenseFileId,
    nextMediaId: opts.nextLicenseFileId,
  });
  await syncVehicleMediaField({
    vehicleId: opts.vehicleId,
    fieldName: 'registrationFileId',
    previousMediaId: opts.previous.registrationFileId,
    nextMediaId: opts.nextRegistrationFileId,
  });
  await syncVehicleMediaField({
    vehicleId: opts.vehicleId,
    fieldName: 'insuranceFileId',
    previousMediaId: opts.previous.insuranceFileId,
    nextMediaId: opts.nextInsuranceFileId,
  });
}

export async function syncVehicleIncidentPhotos(opts: {
  incidentId: Types.ObjectId | string;
  previousPhotoIds: Array<Types.ObjectId | string>;
  nextPhotoIds: Array<Types.ObjectId | string>;
}): Promise<void> {
  await syncMediaUsage({
    entityType: 'vehicle_incident',
    entityId: opts.incidentId,
    fieldName: 'photoIds',
    previousMediaIds: opts.previousPhotoIds,
    nextMediaIds: opts.nextPhotoIds,
  });
}

export async function listVehicleIncidents(
  vehicleId: Types.ObjectId | string
): Promise<VehicleIncidentListItem[]> {
  await connectDB();
  const oid = toObjectId(vehicleId);
  const incidents = await VehicleIncident.find({ vehicleId: oid })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  const userIds = new Set<string>();
  for (const incident of incidents) {
    userIds.add(String(incident.reportedById));
    if (incident.fixedById) userIds.add(String(incident.fixedById));
  }

  const users = userIds.size
    ? await User.find({ _id: { $in: [...userIds] } })
        .select('name email')
        .lean()
        .exec()
    : [];
  const userNameMap = new Map(
    users.map((u) => [String(u._id), u.name || u.email || String(u._id)])
  );

  return incidents.map((incident) => ({
    id: String(incident._id),
    description: incident.description,
    status: incident.status,
    reportedByName: userNameMap.get(String(incident.reportedById)) ?? 'Ismeretlen',
    fixedByName: incident.fixedById ? userNameMap.get(String(incident.fixedById)) : undefined,
    photoIds: (incident.photoIds ?? []).map((id) => String(id)),
    createdAt: incident.createdAt.toISOString(),
    fixedAt: incident.fixedAt?.toISOString(),
  }));
}

export async function createVehicleIncident(opts: {
  vehicleId: Types.ObjectId | string;
  reportedById: Types.ObjectId | string;
  description: string;
  photoIds: Array<Types.ObjectId | string>;
}): Promise<IVehicleIncident> {
  await connectDB();
  const incident = await VehicleIncident.create({
    vehicleId: toObjectId(opts.vehicleId),
    reportedById: toObjectId(opts.reportedById),
    description: opts.description,
    photoIds: opts.photoIds.map((id) => toObjectId(id)),
    status: 'reported',
  });

  if (opts.photoIds.length > 0) {
    await syncVehicleIncidentPhotos({
      incidentId: incident._id,
      previousPhotoIds: [],
      nextPhotoIds: opts.photoIds,
    });
  }

  return incident;
}

export async function markVehicleIncidentFixed(opts: {
  incidentId: Types.ObjectId | string;
  fixedById: Types.ObjectId | string;
}): Promise<IVehicleIncident | null> {
  await connectDB();
  const incident = await VehicleIncident.findById(toObjectId(opts.incidentId)).exec();
  if (!incident) return null;
  if (incident.status === 'fixed') return incident;

  incident.status = 'fixed';
  incident.fixedAt = new Date();
  incident.fixedById = toObjectId(opts.fixedById);
  await incident.save();
  return incident;
}

export async function countOpenVehicleIncidents(): Promise<number> {
  await connectDB();
  return VehicleIncident.countDocuments({ status: 'reported' }).exec();
}
