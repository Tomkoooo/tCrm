import { notFound } from 'next/navigation';
import mongoose from 'mongoose';
import { getCurrentUser, hasPermission, requirePermission } from '@crm/auth';
import {
  canUserReportVehicleIncident,
  getVehicleComplianceWarnings,
  listVehicleIncidents,
} from '@crm/core';
import { connectDB, Company, Role, User, Vehicle } from '@crm/db';
import { companyDataToEntries } from '@crm/lib/validation';
import { Container } from '@crm/ui';
import { VehicleDetailClient } from '../_components/vehicle-detail-client';

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('logistics:read');
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  await connectDB();

  const vehicle = await Vehicle.findById(id).lean().exec();
  if (!vehicle) notFound();

  const [
    canWrite,
    currentUser,
    companies,
    roles,
    company,
    allowedUsers,
    allowedRoles,
    incidents,
    allWarnings,
  ] = await Promise.all([
    hasPermission('logistics:write'),
    getCurrentUser(),
    Company.find({ isActive: true }).sort({ name: 1 }).select('name').lean().exec(),
    Role.find().sort({ name: 1 }).select('name').lean().exec(),
    vehicle.companyId ? Company.findById(vehicle.companyId).lean().exec() : Promise.resolve(null),
    vehicle.allowedUserIds?.length
      ? User.find({ _id: { $in: vehicle.allowedUserIds } })
          .select('name email')
          .lean()
          .exec()
      : Promise.resolve([]),
    vehicle.allowedRoleIds?.length
      ? Role.find({ _id: { $in: vehicle.allowedRoleIds } })
          .select('name')
          .lean()
          .exec()
      : Promise.resolve([]),
    listVehicleIncidents(id),
    getVehicleComplianceWarnings(30),
  ]);

  const dbUser = currentUser
    ? await User.findById(currentUser.id).select('roleIds').lean().exec()
    : null;

  const canReportIncident =
    currentUser && dbUser
      ? await canUserReportVehicleIncident(vehicle, currentUser.id, dbUser.roleIds ?? [])
      : false;

  const vehicleWarnings = allWarnings.filter((warning) => warning.vehicleId === id);

  const vehicleDto = {
    _id: String(vehicle._id),
    name: vehicle.name,
    plateNumber: vehicle.plateNumber,
    lengthMm: vehicle.lengthMm,
    widthMm: vehicle.widthMm,
    heightMm: vehicle.heightMm,
    maxWeightKg: vehicle.maxWeightKg,
    maxVolumeM3: vehicle.maxVolumeM3,
    isActive: Boolean(vehicle.isActive),
    companyId: vehicle.companyId ? String(vehicle.companyId) : undefined,
    registrationDueDate: vehicle.registrationDueDate?.toISOString(),
    insuranceDueDate: vehicle.insuranceDueDate?.toISOString(),
    imageIds: (vehicle.imageIds ?? []).map((mediaId) => String(mediaId)),
    licenseFileId: vehicle.licenseFileId ? String(vehicle.licenseFileId) : undefined,
    registrationFileId: vehicle.registrationFileId ? String(vehicle.registrationFileId) : undefined,
    insuranceFileId: vehicle.insuranceFileId ? String(vehicle.insuranceFileId) : undefined,
    allowedUserIds: (vehicle.allowedUserIds ?? []).map((uid) => String(uid)),
    allowedRoleIds: (vehicle.allowedRoleIds ?? []).map((rid) => String(rid)),
  };

  return (
    <Container className="max-w-6xl">
      <VehicleDetailClient
        vehicle={vehicleDto}
        company={
          company
            ? {
                _id: String(company._id),
                name: company.name,
                slug: company.slug,
                companyDataEntries: companyDataToEntries(company.companyData),
              }
            : undefined
        }
        companies={companies.map((c) => ({ _id: String(c._id), name: c.name }))}
        roles={roles.map((role) => ({ id: String(role._id), name: role.name }))}
        allowedUsers={allowedUsers.map((user) => ({
          id: String(user._id),
          name: user.name || user.email || String(user._id),
        }))}
        allowedRoles={allowedRoles.map((role) => ({
          id: String(role._id),
          name: role.name,
        }))}
        incidents={incidents}
        warnings={vehicleWarnings}
        canWrite={canWrite}
        canReportIncident={canReportIncident}
      />
    </Container>
  );
}
