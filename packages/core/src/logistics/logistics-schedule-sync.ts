import { connectDB, Employee, Warehouse, type ILogisticsJob } from '@crm/db';
import type { Types } from 'mongoose';
import { normalizeJobPickups } from '../logistics/job-pickups';
import { upsertLogisticsScheduleEntry, removeLogisticsScheduleEntries } from '../hr/schedules';

const DEFAULT_GATHER_DURATION_MS = 60 * 60 * 1000;
const DEFAULT_EVENT_DURATION_MS = 4 * 60 * 60 * 1000;

export async function syncLogisticsJobToEmployeeSchedules(
  job: ILogisticsJob,
  actorUserId: Types.ObjectId
): Promise<void> {
  await connectDB();
  normalizeJobPickups(job);

  if (job.status === 'cancelled') {
    await removeLogisticsScheduleEntries(job._id);
    return;
  }

  for (const pickup of job.pickups) {
    if (pickup.status === 'draft' || pickup.status === 'cancelled') {
      await removeLogisticsScheduleEntries(job._id, pickup._id);
      continue;
    }

    const warehouse = await Warehouse.findById(pickup.warehouseId)
      .select({ name: 1, address: 1 })
      .lean()
      .exec();

    const gatherAt = pickup.plannedGatherAt;
    const eventAt = pickup.plannedEventAt ?? job.plannedEventAt;

    if (!gatherAt) {
      await removeLogisticsScheduleEntries(job._id, pickup._id, 'gather');
    }
    if (!eventAt) {
      await removeLogisticsScheduleEntries(job._id, pickup._id, 'event');
    }

    for (const userId of pickup.teamMemberIds ?? []) {
      const employees = await Employee.find({ userId, isActive: true })
        .select({ _id: 1 })
        .lean()
        .exec();
      for (const emp of employees) {
        const employeeId = emp._id as Types.ObjectId;

        if (gatherAt) {
          await upsertLogisticsScheduleEntry(
            {
              employeeId,
              start: gatherAt,
              end: new Date(gatherAt.getTime() + DEFAULT_GATHER_DURATION_MS),
              kind: 'field_work',
              title: `${job.eventName} — összeszedés`,
              notes: pickup.reference,
              locationLabel: warehouse?.name ?? 'Raktár',
              locationAddress: warehouse?.address,
              sourceRef: {
                type: 'logistics_pickup',
                jobId: job._id,
                pickupId: pickup._id,
                leg: 'gather',
              },
            },
            actorUserId
          );
        }

        if (eventAt) {
          await upsertLogisticsScheduleEntry(
            {
              employeeId,
              start: eventAt,
              end: new Date(eventAt.getTime() + DEFAULT_EVENT_DURATION_MS),
              kind: 'field_work',
              title: job.eventName,
              notes: pickup.reference,
              locationLabel: job.eventName,
              locationAddress: job.siteAddress,
              sourceRef: {
                type: 'logistics_pickup',
                jobId: job._id,
                pickupId: pickup._id,
                leg: 'event',
              },
            },
            actorUserId
          );
        }
      }
    }
  }
}
