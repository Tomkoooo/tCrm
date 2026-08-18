import { connectDB, LogisticsJob, type CrewRole, type ILogisticsJob } from '@crm/db-core';
import { listMembershipsForUser } from '@crm/hr';
import type { Types } from 'mongoose';
import { memberHasRole } from './crew';
import { hasGlobalLogisticsScope } from './warehouse-access';

export type FieldActor = {
  userId: Types.ObjectId;
  employeeIds: Types.ObjectId[];
  isLogisticsWrite: boolean;
};

export async function resolveFieldActor(
  userId: Types.ObjectId,
  permissions: string[],
  _job: ILogisticsJob
): Promise<FieldActor> {
  const isLogisticsWrite =
    permissions.includes('logistics:write') || hasGlobalLogisticsScope(permissions);
  const memberships = await listMembershipsForUser(userId);
  return {
    userId,
    employeeIds: memberships.map((m) => m._id),
    isLogisticsWrite,
  };
}

export function canPerformCrewRole(
  actor: FieldActor,
  job: ILogisticsJob,
  roles: CrewRole[]
): boolean {
  if (actor.isLogisticsWrite) return true;
  return actor.employeeIds.some((id) => memberHasRole(job.crew ?? [], id, roles));
}

export function assertCanPerformCrewRole(
  actor: FieldActor,
  job: ILogisticsJob,
  roles: CrewRole[]
): void {
  if (!canPerformCrewRole(actor, job, roles)) {
    throw new Error('Nincs jogosultság ehhez a művelethez ezen a feladaton.');
  }
}

export async function loadJobOrThrow(jobId: Types.ObjectId): Promise<ILogisticsJob> {
  await connectDB();
  const job = await LogisticsJob.findById(jobId);
  if (!job) throw new Error('Job not found');
  return job;
}
