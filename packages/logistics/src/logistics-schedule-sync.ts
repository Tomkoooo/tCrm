import { connectDB, type CrewRole, type ILogisticsJob, type ILogisticsPickup } from '@crm/db-core';
import type { Types } from 'mongoose';
import { removeScheduleBySourceRef, upsertJobScheduleEntry } from '@crm/hr';
import { normalizeJobPickups } from './job-pickups';
import { resolveJobWindows } from './job-windows';

const DEFAULT_SLICE_MS = 3 * 60 * 60 * 1000;

function roleWindow(
  role: CrewRole,
  windows: { gather: Date; event: Date; returnAt: Date }
): { start: Date; end: Date } {
  switch (role) {
    case 'director':
      return { start: windows.gather, end: windows.returnAt };
    case 'builder':
      return { start: windows.event, end: windows.returnAt };
    case 'pickup':
      return {
        start: windows.gather,
        end:
          windows.event > windows.gather
            ? windows.event
            : new Date(windows.gather.getTime() + DEFAULT_SLICE_MS),
      };
    case 'driver':
      return { start: windows.gather, end: windows.returnAt };
    case 'dropoff':
      return { start: windows.event, end: windows.returnAt };
  }
}

export function resolvePickupScheduleWindow(
  pickup: ILogisticsPickup,
  job: ILogisticsJob
): { start: Date; end: Date } | null {
  const windows = resolveJobWindows(job);
  const gatherAt = pickup.plannedGatherAt ?? windows.gather;
  const eventAt = pickup.plannedEventAt ?? windows.event;
  const returnAt = pickup.plannedReturnAt ?? windows.returnAt;
  if (!gatherAt && !eventAt) return null;
  const start = gatherAt ?? eventAt;
  const end = returnAt > start ? returnAt : new Date(start.getTime() + DEFAULT_SLICE_MS);
  return { start, end };
}

/**
 * Upsert/delete ScheduleEntry rows per crew role.
 * Cancelled jobs remove their sourceRef rows.
 */
export async function syncLogisticsJobToEmployeeSchedules(
  job: ILogisticsJob,
  actorUserId: Types.ObjectId
): Promise<void> {
  await connectDB();
  normalizeJobPickups(job);

  await removeScheduleBySourceRef('logistics', 'job', job._id);
  for (const pickup of job.pickups ?? []) {
    await removeScheduleBySourceRef('logistics', 'pickup', pickup._id);
  }

  if (job.status === 'cancelled') return;

  const windows = resolveJobWindows(job);
  const crew = job.crew ?? [];

  for (const member of crew) {
    for (const role of member.roles) {
      const isRoundRole = role === 'pickup' || role === 'driver' || role === 'dropoff';
      if (isRoundRole && job.pickups?.length) {
        for (const pickup of job.pickups) {
          if (pickup.status === 'draft' || pickup.status === 'cancelled') continue;
          const { start, end } = roleWindow(role, {
            gather: pickup.plannedGatherAt ?? windows.gather,
            event: pickup.plannedEventAt ?? windows.event,
            returnAt: pickup.plannedReturnAt ?? windows.returnAt,
          });
          await upsertJobScheduleEntry({
            employeeId: member.employeeId,
            start,
            end,
            title: job.eventName,
            notes: job.siteAddress,
            pickupId: pickup._id,
            jobId: job._id,
            role,
            actorUserId,
          });
        }
      } else if (!isRoundRole) {
        const { start, end } = roleWindow(role, windows);
        await upsertJobScheduleEntry({
          employeeId: member.employeeId,
          start,
          end,
          title: job.eventName,
          notes: job.siteAddress,
          jobId: job._id,
          role,
          actorUserId,
        });
      }
    }
  }
}
