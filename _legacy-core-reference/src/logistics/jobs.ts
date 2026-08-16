import {
  connectDB,
  LogisticsJob,
  Product,
  type IJobLine,
  type ILogisticsJob,
  type ILogisticsPickup,
  type JobStatus,
  type PickupStatus,
} from '@crm/db';
import type { Types } from 'mongoose';
import { formatPickupReference, generateJobReference } from './job-references';
import {
  assertPickupStatus,
  findPickupLineIndex,
  getPickup,
  normalizeJobPickups,
  syncJobStatusFromPickups,
} from './job-pickups';
import { createMovement, confirmMovement } from './movements';
import { enqueueLogisticsNotification } from './notifications';
import { syncLogisticsJobToEmployeeSchedules } from './logistics-schedule-sync';

export type JobLineInput = {
  productId: Types.ObjectId;
  requestedQuantity: number;
};

export type CreatePickupParams = {
  label?: string;
  warehouseId: Types.ObjectId;
  vehicleId?: Types.ObjectId;
  teamMemberIds?: Types.ObjectId[];
  contactEmails?: string[];
  note?: string;
  plannedGatherAt?: Date;
  plannedEventAt?: Date;
  lines: JobLineInput[];
};

export type CreateJobParams = {
  eventName: string;
  siteAddress: string;
  plannedEventAt?: Date;
  pickups: CreatePickupParams[];
  note?: string;
  createdBy: Types.ObjectId;
  publish?: boolean;
};

export type GatherLineInput = {
  productId: Types.ObjectId;
  gatheredQuantity: number;
};

export type InstallLineInput = {
  productId: Types.ObjectId;
  installedQuantity: number;
  installedLocation?: string;
};

export type ReturnLineInput = {
  productId: Types.ObjectId;
  returnedQuantity: number;
};

export type CheckInLineInput = {
  productId: Types.ObjectId;
  checkedQuantity: number;
};

function mapLines(inputs: JobLineInput[]): IJobLine[] {
  return inputs.map((l) => ({
    productId: l.productId,
    requestedQuantity: l.requestedQuantity,
    gatheredQuantity: 0,
    installedQuantity: 0,
    returnedQuantity: 0,
    checkedQuantity: 0,
    lostQuantity: 0,
  }));
}

function initialPickupStatus(publish: boolean): PickupStatus {
  return publish ? 'scheduled' : 'draft';
}

export async function createLogisticsJob(params: CreateJobParams): Promise<ILogisticsJob> {
  await connectDB();

  if (!params.pickups.length) {
    throw new Error('At least one pickup is required');
  }

  for (const pickup of params.pickups) {
    if (!pickup.lines.length) {
      throw new Error('Each pickup must have at least one line');
    }
  }

  const reference = await generateJobReference();
  const publish = Boolean(params.publish);
  const now = publish ? new Date() : undefined;

  const pickups = params.pickups.map((p, index) => ({
    reference: formatPickupReference(reference, index + 1),
    label: p.label,
    warehouseId: p.warehouseId,
    vehicleId: p.vehicleId,
    teamMemberIds: p.teamMemberIds ?? [],
    contactEmails: p.contactEmails ?? [],
    note: p.note,
    status: initialPickupStatus(publish),
    lines: mapLines(p.lines),
    notifications: {},
    documents: {},
    scheduledAt: now,
    plannedGatherAt: p.plannedGatherAt,
    plannedEventAt: p.plannedEventAt,
  }));

  const [job] = await LogisticsJob.create([
    {
      reference,
      eventName: params.eventName,
      siteAddress: params.siteAddress,
      plannedEventAt: params.plannedEventAt,
      status: publish ? 'scheduled' : 'draft',
      pickups,
      note: params.note,
      createdBy: params.createdBy,
      scheduledAt: now,
    },
  ]);

  if (publish) {
    const saved = await LogisticsJob.findById(job._id);
    if (saved) {
      normalizeJobPickups(saved);
      for (const pickup of saved.pickups) {
        await enqueueLogisticsNotification({
          kind: 'job_scheduled',
          jobId: saved._id,
          pickupId: pickup._id,
        });
      }
      await syncLogisticsJobToEmployeeSchedules(saved, params.createdBy);
    }
  }

  return job;
}

export async function scheduleLogisticsJob(id: Types.ObjectId): Promise<ILogisticsJob> {
  await connectDB();
  const job = await LogisticsJob.findById(id);
  if (!job) throw new Error('Job not found');

  const pickups = normalizeJobPickups(job);
  const now = new Date();

  for (const pickup of pickups) {
    if (pickup.status === 'draft') {
      pickup.status = 'scheduled';
      pickup.scheduledAt = now;
      await enqueueLogisticsNotification({
        kind: 'job_scheduled',
        jobId: job._id,
        pickupId: pickup._id,
      });
    }
  }

  job.scheduledAt = now;
  syncJobStatusFromPickups(job);
  job.markModified('pickups');
  await job.save();
  await syncLogisticsJobToEmployeeSchedules(job, job.createdBy);
  return job;
}

export async function confirmPickupGathering(
  jobId: Types.ObjectId,
  pickupId: Types.ObjectId,
  gatherLines: GatherLineInput[],
  userId: Types.ObjectId
): Promise<ILogisticsJob> {
  await connectDB();
  const job = await LogisticsJob.findById(jobId);
  if (!job) throw new Error('Job not found');

  const pickup = getPickup(job, pickupId);
  assertPickupStatus(pickup, ['scheduled']);

  for (const input of gatherLines) {
    const idx = findPickupLineIndex(pickup, input.productId);
    pickup.lines[idx].gatheredQuantity = Math.max(0, input.gatheredQuantity);
  }

  const pickLines = pickup.lines
    .filter((l) => l.gatheredQuantity > 0)
    .map((l) => ({
      productId: l.productId,
      quantity: l.gatheredQuantity,
      fromWarehouseId: pickup.warehouseId,
    }));

  if (pickLines.length) {
    const movement = await createMovement({
      type: 'pick',
      fromWarehouseId: pickup.warehouseId,
      note: `Összeszedés ${pickup.reference}`,
      lines: pickLines,
      createdBy: userId,
    });
    await confirmMovement(movement._id, userId);
    pickup.pickMovementId = movement._id;
  }

  pickup.status = 'gathered';
  pickup.gatheredAt = new Date();
  syncJobStatusFromPickups(job);
  job.markModified('pickups');
  await job.save();

  await enqueueLogisticsNotification({
    kind: 'pickup_gathered',
    jobId: job._id,
    pickupId: pickup._id,
    actorUserId: userId,
  });

  return job;
}

export async function confirmPickupPickup(
  jobId: Types.ObjectId,
  pickupId: Types.ObjectId
): Promise<ILogisticsJob> {
  await connectDB();
  const job = await LogisticsJob.findById(jobId);
  if (!job) throw new Error('Job not found');

  const pickup = getPickup(job, pickupId);
  assertPickupStatus(pickup, ['gathered']);
  pickup.status = 'picked_up';
  pickup.pickedUpAt = new Date();
  syncJobStatusFromPickups(job);
  job.markModified('pickups');
  await job.save();

  await enqueueLogisticsNotification({
    kind: 'pickup_ready_for_collection',
    jobId: job._id,
    pickupId: pickup._id,
  });

  return job;
}

export async function confirmPickupDelivery(
  jobId: Types.ObjectId,
  pickupId: Types.ObjectId
): Promise<ILogisticsJob> {
  await connectDB();
  const job = await LogisticsJob.findById(jobId);
  if (!job) throw new Error('Job not found');

  const pickup = getPickup(job, pickupId);
  assertPickupStatus(pickup, ['picked_up']);
  pickup.status = 'delivered';
  pickup.deliveredAt = new Date();
  syncJobStatusFromPickups(job);
  job.markModified('pickups');
  await job.save();

  await enqueueLogisticsNotification({
    kind: 'pickup_delivered',
    jobId: job._id,
    pickupId: pickup._id,
  });

  return job;
}

export async function updatePickupInstallation(
  jobId: Types.ObjectId,
  pickupId: Types.ObjectId,
  installLines: InstallLineInput[]
): Promise<ILogisticsJob> {
  await connectDB();
  const job = await LogisticsJob.findById(jobId);
  if (!job) throw new Error('Job not found');

  const pickup = getPickup(job, pickupId);
  assertPickupStatus(pickup, ['delivered', 'returning']);

  for (const input of installLines) {
    const idx = findPickupLineIndex(pickup, input.productId);
    pickup.lines[idx].installedQuantity = Math.max(0, input.installedQuantity);
    if (input.installedLocation !== undefined) {
      pickup.lines[idx].installedLocation = input.installedLocation.trim() || undefined;
    }
  }

  job.markModified('pickups');
  await job.save();
  return job;
}

export async function confirmPickupReturnDeparture(
  jobId: Types.ObjectId,
  pickupId: Types.ObjectId,
  returnLines: ReturnLineInput[]
): Promise<ILogisticsJob> {
  await connectDB();
  const job = await LogisticsJob.findById(jobId);
  if (!job) throw new Error('Job not found');

  const pickup = getPickup(job, pickupId);
  assertPickupStatus(pickup, ['delivered']);

  for (const input of returnLines) {
    const idx = findPickupLineIndex(pickup, input.productId);
    pickup.lines[idx].returnedQuantity = Math.max(0, input.returnedQuantity);
  }

  pickup.status = 'returning';
  pickup.returningAt = new Date();
  syncJobStatusFromPickups(job);
  job.markModified('pickups');
  await job.save();

  await enqueueLogisticsNotification({
    kind: 'pickup_return_reminder',
    jobId: job._id,
    pickupId: pickup._id,
  });

  return job;
}

export async function confirmPickupCheckIn(
  jobId: Types.ObjectId,
  pickupId: Types.ObjectId,
  checkInLines: CheckInLineInput[],
  userId: Types.ObjectId
): Promise<ILogisticsJob> {
  await connectDB();
  const job = await LogisticsJob.findById(jobId);
  if (!job) throw new Error('Job not found');

  const pickup = getPickup(job, pickupId);
  assertPickupStatus(pickup, ['returning']);

  const products = await Product.find({
    _id: { $in: pickup.lines.map((l) => l.productId) },
  })
    .select({ isConsumable: 1 })
    .lean()
    .exec();
  const consumableMap = new Map(products.map((p) => [String(p._id), Boolean(p.isConsumable)]));

  for (const input of checkInLines) {
    const idx = findPickupLineIndex(pickup, input.productId);
    const checked = Math.max(0, input.checkedQuantity);
    pickup.lines[idx].checkedQuantity = checked;
    const isConsumable = consumableMap.get(String(input.productId)) ?? false;
    const gathered = pickup.lines[idx].gatheredQuantity;
    pickup.lines[idx].lostQuantity = isConsumable ? 0 : Math.max(0, gathered - checked);
  }

  const returnLines = pickup.lines
    .filter((l) => l.checkedQuantity > 0)
    .map((l) => ({
      productId: l.productId,
      quantity: l.checkedQuantity,
      toWarehouseId: pickup.warehouseId,
    }));

  if (returnLines.length) {
    const movement = await createMovement({
      type: 'return',
      toWarehouseId: pickup.warehouseId,
      note: `Visszáru ${pickup.reference}`,
      lines: returnLines,
      createdBy: userId,
    });
    await confirmMovement(movement._id, userId);
    pickup.returnMovementId = movement._id;
  }

  pickup.status = 'completed';
  pickup.completedAt = new Date();
  syncJobStatusFromPickups(job);
  job.markModified('pickups');
  await job.save();

  await enqueueLogisticsNotification({
    kind: 'pickup_checkin_complete',
    jobId: job._id,
    pickupId: pickup._id,
    actorUserId: userId,
  });

  return job;
}

export async function cancelLogisticsJob(id: Types.ObjectId): Promise<ILogisticsJob> {
  await connectDB();
  const job = await LogisticsJob.findById(id);
  if (!job) throw new Error('Job not found');

  const pickups = normalizeJobPickups(job);
  for (const pickup of pickups) {
    if (pickup.status === 'draft' || pickup.status === 'scheduled') {
      pickup.status = 'cancelled';
    }
  }

  syncJobStatusFromPickups(job);
  job.markModified('pickups');
  await job.save();
  return job;
}

// --- Backward-compatible aliases (job-level → first pickup) — deprecated ---

function firstPickupId(job: ILogisticsJob): Types.ObjectId {
  const pickups = normalizeJobPickups(job);
  if (!pickups.length) throw new Error('No pickups on job');
  return pickups[0]._id;
}

/** @deprecated Use confirmPickupGathering with pickupId */
export async function confirmJobGathering(
  id: Types.ObjectId,
  gatherLines: GatherLineInput[],
  userId: Types.ObjectId
): Promise<ILogisticsJob> {
  const job = await LogisticsJob.findById(id);
  if (!job) throw new Error('Job not found');
  normalizeJobPickups(job);
  return confirmPickupGathering(id, firstPickupId(job), gatherLines, userId);
}

export async function confirmJobPickup(id: Types.ObjectId): Promise<ILogisticsJob> {
  const job = await LogisticsJob.findById(id);
  if (!job) throw new Error('Job not found');
  normalizeJobPickups(job);
  return confirmPickupPickup(id, firstPickupId(job));
}

export async function confirmJobDelivery(id: Types.ObjectId): Promise<ILogisticsJob> {
  const job = await LogisticsJob.findById(id);
  if (!job) throw new Error('Job not found');
  normalizeJobPickups(job);
  return confirmPickupDelivery(id, firstPickupId(job));
}

export async function updateJobInstallation(
  id: Types.ObjectId,
  installLines: InstallLineInput[]
): Promise<ILogisticsJob> {
  const job = await LogisticsJob.findById(id);
  if (!job) throw new Error('Job not found');
  normalizeJobPickups(job);
  return updatePickupInstallation(id, firstPickupId(job), installLines);
}

export async function confirmJobReturnDeparture(
  id: Types.ObjectId,
  returnLines: ReturnLineInput[]
): Promise<ILogisticsJob> {
  const job = await LogisticsJob.findById(id);
  if (!job) throw new Error('Job not found');
  normalizeJobPickups(job);
  return confirmPickupReturnDeparture(id, firstPickupId(job), returnLines);
}

export async function confirmJobCheckIn(
  id: Types.ObjectId,
  checkInLines: CheckInLineInput[],
  userId: Types.ObjectId
): Promise<ILogisticsJob> {
  const job = await LogisticsJob.findById(id);
  if (!job) throw new Error('Job not found');
  normalizeJobPickups(job);
  return confirmPickupCheckIn(id, firstPickupId(job), checkInLines, userId);
}

export async function getLogisticsKpiSummary(): Promise<{
  completedJobs: number;
  activeJobs: number;
  totalGathered: number;
  totalLost: number;
  lossRatePercent: number;
  lostValueHuf: number;
  lostValueEur: number;
  topSitesByLoss: Array<{ siteAddress: string; eventName: string; totalLost: number }>;
  topDriversByLoss: Array<{ driverId: string; totalLost: number }>;
}> {
  await connectDB();

  const allJobs = await LogisticsJob.find().lean().exec();
  const completed = allJobs.filter((j) => {
    const pickups = j.pickups?.length
      ? j.pickups
      : j.sourceWarehouseId
        ? [{ status: j.status, lines: j.lines ?? [] }]
        : [];
    return pickups.length > 0 && pickups.every((p) => p.status === 'completed');
  });

  const activeStatuses: JobStatus[] = [
    'scheduled',
    'gathered',
    'picked_up',
    'delivered',
    'returning',
  ];
  const activeJobs = allJobs.filter((j) => {
    const pickups = j.pickups?.length ? j.pickups : [];
    if (pickups.length) return pickups.some((p) => activeStatuses.includes(p.status as JobStatus));
    return activeStatuses.includes(j.status as JobStatus);
  }).length;

  const productIds = new Set<string>();
  for (const job of completed) {
    for (const pickup of job.pickups ?? []) {
      for (const line of pickup.lines) {
        if (line.lostQuantity > 0) productIds.add(String(line.productId));
      }
    }
  }

  const products = await Product.find({ _id: { $in: [...productIds] } })
    .select({ pricing: 1 })
    .lean()
    .exec();
  const priceMap = new Map(
    products.map((p) => [
      String(p._id),
      {
        huf: p.pricing?.merchantPriceHuf ?? p.pricing?.streetPriceHuf ?? 0,
        eur: p.pricing?.merchantPriceEur ?? p.pricing?.streetPriceEur ?? 0,
      },
    ])
  );

  let totalGathered = 0;
  let totalLost = 0;
  let lostValueHuf = 0;
  let lostValueEur = 0;
  const siteLoss = new Map<string, { eventName: string; totalLost: number }>();
  const driverLoss = new Map<string, number>();

  for (const job of completed) {
    let jobLost = 0;
    for (const pickup of job.pickups ?? []) {
      const pickupLost = pickup.lines.reduce((s, l) => s + l.lostQuantity, 0);
      jobLost += pickupLost;
      for (const line of pickup.lines) {
        totalGathered += line.gatheredQuantity;
        totalLost += line.lostQuantity;
        const prices = priceMap.get(String(line.productId)) ?? { huf: 0, eur: 0 };
        lostValueHuf += line.lostQuantity * prices.huf;
        lostValueEur += line.lostQuantity * prices.eur;
      }
      if (pickupLost > 0) {
        for (const memberId of pickup.teamMemberIds ?? []) {
          const dId = String(memberId);
          driverLoss.set(dId, (driverLoss.get(dId) ?? 0) + pickupLost);
        }
      }
    }
    if (jobLost > 0) {
      const siteKey = job.siteAddress;
      const prev = siteLoss.get(siteKey) ?? { eventName: job.eventName, totalLost: 0 };
      siteLoss.set(siteKey, { eventName: job.eventName, totalLost: prev.totalLost + jobLost });
    }
  }

  const topSitesByLoss = [...siteLoss.entries()]
    .map(([siteAddress, v]) => ({ siteAddress, eventName: v.eventName, totalLost: v.totalLost }))
    .sort((a, b) => b.totalLost - a.totalLost)
    .slice(0, 10);

  const topDriversByLoss = [...driverLoss.entries()]
    .map(([driverId, totalLost]) => ({ driverId, totalLost }))
    .sort((a, b) => b.totalLost - a.totalLost)
    .slice(0, 10);

  const lossRatePercent =
    totalGathered > 0 ? Math.round((totalLost / totalGathered) * 10000) / 100 : 0;

  return {
    completedJobs: completed.length,
    activeJobs,
    totalGathered,
    totalLost,
    lossRatePercent,
    lostValueHuf,
    lostValueEur,
    topSitesByLoss,
    topDriversByLoss,
  };
}
