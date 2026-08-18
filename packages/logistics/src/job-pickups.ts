import type {
  IJobLine,
  ILogisticsJob,
  ILogisticsPickup,
  JobStatus,
  PickupStatus,
} from '@crm/db-core';
import mongoose, { type Types } from 'mongoose';
import { formatPickupReference } from './job-references';

const STATUS_ORDER: PickupStatus[] = [
  'draft',
  'scheduled',
  'gathered',
  'picked_up',
  'delivered',
  'returning',
  'completed',
  'cancelled',
];

function statusRank(s: PickupStatus): number {
  const i = STATUS_ORDER.indexOf(s);
  return i >= 0 ? i : 0;
}

/** Read pickups including legacy single-warehouse shape (does not mutate). */
export function resolveJobPickups(job: ILogisticsJob): ILogisticsPickup[] {
  if (job.pickups?.length) {
    return job.pickups;
  }

  if (!job.sourceWarehouseId) {
    return [];
  }

  const lines: IJobLine[] = (job.lines ?? []).map((l) => ({ ...l }));
  const teamMemberIds = job.assignedDriverId ? [job.assignedDriverId] : [];

  return [
    {
      _id: new mongoose.Types.ObjectId(),
      reference: formatPickupReference(job.reference, 1),
      warehouseId: job.sourceWarehouseId,
      vehicleId: job.assignedVehicleId,
      employeeIds: [],
      teamMemberIds,
      status: job.status,
      lines,
      pickMovementId: job.pickMovementId,
      returnMovementId: job.returnMovementId,
      scheduledAt: job.scheduledAt,
      gatheredAt: job.gatheredAt,
      pickedUpAt: job.pickedUpAt,
      deliveredAt: job.deliveredAt,
      returningAt: job.returningAt,
      completedAt: job.completedAt,
      notifications: {},
      documents: {},
    },
  ];
}

/** Migrate legacy jobs into `pickups` on the Mongoose document before save. */
export function normalizeJobPickups(job: ILogisticsJob): ILogisticsPickup[] {
  if (job.pickups?.length) {
    return job.pickups;
  }
  const resolved = resolveJobPickups(job);
  if (resolved.length) {
    job.pickups = resolved;
  }
  return job.pickups;
}

export function getPickup(job: ILogisticsJob, pickupId: Types.ObjectId): ILogisticsPickup {
  const pickups = normalizeJobPickups(job);
  const pickup = pickups.find((p) => p._id.equals(pickupId));
  if (!pickup) throw new Error('Pickup not found on this job');
  return pickup;
}

export function assertPickupStatus(pickup: ILogisticsPickup, allowed: PickupStatus[]) {
  if (!allowed.includes(pickup.status)) {
    throw new Error(`Invalid pickup status transition from ${pickup.status}`);
  }
}

export function findPickupLineIndex(pickup: ILogisticsPickup, productId: Types.ObjectId): number {
  const idx = pickup.lines.findIndex((l) => l.productId.equals(productId));
  if (idx < 0) throw new Error('Product not found on pickup lines');
  return idx;
}

/** Roll up event status from all pickups (lowest incomplete wins; all cancelled → cancelled). */
export function syncJobStatusFromPickups(job: ILogisticsJob): void {
  const pickups = normalizeJobPickups(job);
  if (!pickups.length) return;

  if (pickups.every((p) => p.status === 'cancelled')) {
    job.status = 'cancelled';
    return;
  }

  const active = pickups.filter((p) => p.status !== 'cancelled');
  if (!active.length) {
    job.status = 'cancelled';
    return;
  }

  if (active.every((p) => p.status === 'completed')) {
    job.status = 'completed';
    job.completedAt = active.reduce<Date | undefined>(
      (max, p) => (p.completedAt && (!max || p.completedAt > max) ? p.completedAt : max),
      undefined
    );
    return;
  }

  let minRank = statusRank('completed');
  let minStatus: JobStatus = 'completed';
  for (const p of active) {
    const r = statusRank(p.status);
    if (r < minRank) {
      minRank = r;
      minStatus = p.status;
    }
  }
  job.status = minStatus;
}

export function iterAllPickupLines(
  job: ILogisticsJob
): Array<{ pickup: ILogisticsPickup; line: IJobLine }> {
  const out: Array<{ pickup: ILogisticsPickup; line: IJobLine }> = [];
  for (const pickup of normalizeJobPickups(job)) {
    for (const line of pickup.lines) {
      out.push({ pickup, line });
    }
  }
  return out;
}
