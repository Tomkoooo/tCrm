import { connectDB, type ILogisticsJob } from '@crm/db-core';
import type { Types } from 'mongoose';
import { removeScheduleBySourceRef, upsertJobScheduleEntry } from '@crm/hr';

const DEFAULT_SLICE_MS = 3 * 60 * 60 * 1000;

function resolveWindow(job: ILogisticsJob): { start: Date; end: Date } {
  const start = job.pickupAt ?? job.eventAt ?? new Date();
  const end =
    job.returnAt && job.returnAt > start
      ? job.returnAt
      : new Date(start.getTime() + DEFAULT_SLICE_MS);
  return { start, end };
}

/**
 * Upsert/delete ScheduleEntry rows for the job's pickup/dropoff/crew employees.
 * Cancelled jobs remove their sourceRef rows.
 */
export async function syncLogisticsJobToEmployeeSchedules(
  job: ILogisticsJob,
  actorUserId: Types.ObjectId
): Promise<void> {
  await connectDB();

  await removeScheduleBySourceRef('logistics', 'job', job._id);

  if (job.status === 'cancelled') return;

  const { start, end } = resolveWindow(job);
  const seen = new Set<string>();

  if (job.pickupEmployeeId) {
    seen.add(String(job.pickupEmployeeId));
    await upsertJobScheduleEntry({
      employeeId: job.pickupEmployeeId,
      start,
      end,
      title: job.eventName,
      notes: job.siteAddress,
      jobId: job._id,
      role: 'pickup',
      actorUserId,
    });
  }

  if (job.dropoffEmployeeId && !seen.has(String(job.dropoffEmployeeId))) {
    seen.add(String(job.dropoffEmployeeId));
    await upsertJobScheduleEntry({
      employeeId: job.dropoffEmployeeId,
      start,
      end,
      title: job.eventName,
      notes: job.siteAddress,
      jobId: job._id,
      role: 'dropoff',
      actorUserId,
    });
  }

  for (const employeeId of job.crewEmployeeIds ?? []) {
    if (seen.has(String(employeeId))) continue;
    seen.add(String(employeeId));
    await upsertJobScheduleEntry({
      employeeId,
      start,
      end,
      title: job.eventName,
      notes: job.siteAddress,
      jobId: job._id,
      role: 'crew',
      actorUserId,
    });
  }
}
