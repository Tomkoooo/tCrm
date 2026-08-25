import {
  connectDB,
  LogisticsJob,
  Product,
  type IDemandLine,
  type IJobLine,
  type ILogisticsJob,
  type JobActivityKind,
  type JobStatus,
} from '@crm/db-core';
import mongoose, { type Types } from 'mongoose';
import { generateJobReference } from './job-references';
import { explodeDemandLines } from './demand-explode';
import { createMovement, confirmMovement } from './movements';
import { sendJobAssignmentEmail } from './notifications';
import { syncLogisticsJobToEmployeeSchedules } from './logistics-schedule-sync';

export type DemandLineInput = {
  productId?: Types.ObjectId;
  requestedQuantity: number;
  isOptional?: boolean;
  note?: string;
  kit?: IDemandLine['kit'];
  warehouseId?: Types.ObjectId;
};

export type CreateJobParams = {
  eventName: string;
  siteAddress: string;
  note?: string;
  eventAt?: Date;
  pickupAt?: Date;
  returnAt?: Date;
  demandLines: DemandLineInput[];
  createdBy: Types.ObjectId;
};

export type AssignJobEmployeesParams = {
  pickupEmployeeId: Types.ObjectId;
  dropoffEmployeeId?: Types.ObjectId;
  crewEmployeeIds?: Types.ObjectId[];
  vehicleId?: Types.ObjectId;
};

export type PickupCheckInLineInput = {
  productId: Types.ObjectId;
  gatheredQuantity: number;
  warehouseId?: Types.ObjectId;
};

export type ReturnCheckInLineInput = {
  productId: Types.ObjectId;
  checkedQuantity: number;
  returnWarehouseId?: Types.ObjectId;
};

export type JobEmployeeRole = 'pickup' | 'dropoff' | 'crew';

function pushActivity(
  job: ILogisticsJob,
  kind: JobActivityKind,
  actorUserId: Types.ObjectId,
  message?: string
) {
  job.activities = [
    ...(job.activities ?? []),
    { _id: new mongoose.Types.ObjectId(), kind, at: new Date(), actorUserId, message } as never,
  ];
}

function findLine(job: ILogisticsJob, productId: Types.ObjectId): IJobLine {
  const line = job.lines.find((l) => l.productId.equals(productId));
  if (!line) throw new Error('Tétel nem található a listán.');
  return line;
}

export async function createLogisticsJob(params: CreateJobParams): Promise<ILogisticsJob> {
  await connectDB();
  if (!params.demandLines.length) {
    throw new Error('Legalább egy tétel kell az igénylistára.');
  }

  const reference = await generateJobReference();
  const [job] = await LogisticsJob.create([
    {
      reference,
      eventName: params.eventName,
      siteAddress: params.siteAddress,
      note: params.note,
      eventAt: params.eventAt,
      pickupAt: params.pickupAt,
      returnAt: params.returnAt,
      status: 'draft',
      demandLines: params.demandLines,
      lines: [],
      crewEmployeeIds: [],
      pickMovementIds: [],
      returnMovementIds: [],
      feedback: [],
      activities: [
        {
          kind: 'created',
          at: new Date(),
          actorUserId: params.createdBy,
          message: `${params.demandLines.length} tétel`,
        },
      ],
      createdBy: params.createdBy,
    },
  ]);

  return job;
}

export async function updateJobDemand(
  jobId: Types.ObjectId,
  demandLines: DemandLineInput[],
  actorUserId: Types.ObjectId
): Promise<ILogisticsJob> {
  await connectDB();
  const job = await LogisticsJob.findById(jobId);
  if (!job) throw new Error('Job not found');
  if (job.status === 'completed' || job.status === 'cancelled') {
    throw new Error('Lezárt eseményen már nem módosítható a lista.');
  }
  if (!demandLines.length) throw new Error('Az igénylista nem lehet üres.');

  job.demandLines = demandLines as IDemandLine[];
  pushActivity(job, 'demand_changed', actorUserId, `${demandLines.length} tétel`);
  job.markModified('activities');
  await job.save();
  return job;
}

export async function assignJobEmployees(
  jobId: Types.ObjectId,
  params: AssignJobEmployeesParams
): Promise<ILogisticsJob> {
  await connectDB();
  const job = await LogisticsJob.findById(jobId);
  if (!job) throw new Error('Job not found');
  if (job.status === 'completed' || job.status === 'cancelled') {
    throw new Error('Lezárt eseményen már nem módosítható a csapat.');
  }

  job.pickupEmployeeId = params.pickupEmployeeId;
  job.dropoffEmployeeId = params.dropoffEmployeeId;
  job.crewEmployeeIds = params.crewEmployeeIds ?? [];
  job.vehicleId = params.vehicleId;
  await job.save();
  return job;
}

export async function scheduleLogisticsJob(
  jobId: Types.ObjectId,
  actorUserId: Types.ObjectId
): Promise<ILogisticsJob> {
  await connectDB();
  const job = await LogisticsJob.findById(jobId);
  if (!job) throw new Error('Job not found');
  if (job.status !== 'draft') throw new Error('Csak tervezet ütemezhető.');
  if (!job.pickupEmployeeId) {
    throw new Error('Előbb jelölj ki átvételért felelős dolgozót.');
  }
  if (!job.demandLines?.length) throw new Error('Nincs igénylista.');

  const productIds = [
    ...job.demandLines.map((d) => d.productId).filter(Boolean),
    ...job.demandLines.flatMap((d) => (d.kit?.components ?? []).map((c) => c.productId)),
  ] as Types.ObjectId[];
  const products = await Product.find({ _id: { $in: productIds } })
    .select({ components: 1 })
    .lean()
    .exec();
  const productMap = new Map(products.map((p) => [String(p._id), p]));
  const physical = explodeDemandLines(job.demandLines, productMap);

  if (physical.some((l) => !l.warehouseId)) {
    throw new Error('Minden tételhez válassz forrás raktárt, mielőtt ütemezel.');
  }

  job.lines = physical.map((l) => ({
    productId: l.productId,
    requestedQuantity: l.requestedQuantity,
    isOptional: l.isOptional,
    warehouseId: l.warehouseId,
    gatheredQuantity: 0,
    returnedQuantity: 0,
    checkedQuantity: 0,
    lostQuantity: 0,
  }));
  job.status = 'scheduled';
  pushActivity(job, 'scheduled', actorUserId);
  job.markModified('lines');
  job.markModified('activities');
  await job.save();

  await sendJobAssignmentEmail(job, 'pickup', actorUserId);
  if (job.dropoffEmployeeId && !job.dropoffEmployeeId.equals(job.pickupEmployeeId)) {
    await sendJobAssignmentEmail(job, 'dropoff', actorUserId);
  }
  await syncLogisticsJobToEmployeeSchedules(job, actorUserId);
  return job;
}

export async function confirmPickupCheckIn(
  jobId: Types.ObjectId,
  lines: PickupCheckInLineInput[],
  note: string | undefined,
  actorUserId: Types.ObjectId
): Promise<ILogisticsJob> {
  await connectDB();
  const job = await LogisticsJob.findById(jobId);
  if (!job) throw new Error('Job not found');
  if (job.status !== 'scheduled') {
    throw new Error('Az esemény nincs átvételre kész állapotban.');
  }

  for (const input of lines) {
    const line = findLine(job, input.productId);
    line.gatheredQuantity = Math.max(0, input.gatheredQuantity);
    if (input.warehouseId) line.warehouseId = input.warehouseId;
  }

  const grouped = new Map<string, Array<{ productId: Types.ObjectId; quantity: number }>>();
  for (const line of job.lines) {
    if (line.gatheredQuantity <= 0 || !line.warehouseId) continue;
    const key = String(line.warehouseId);
    const list = grouped.get(key) ?? [];
    list.push({ productId: line.productId, quantity: line.gatheredQuantity });
    grouped.set(key, list);
  }

  const movementIds: Types.ObjectId[] = [];
  for (const [warehouseId, groupLines] of grouped) {
    const fromWarehouseId = new mongoose.Types.ObjectId(warehouseId);
    const movement = await createMovement({
      type: 'pick',
      fromWarehouseId,
      note: `Összeszedés ${job.reference}`,
      lines: groupLines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        fromWarehouseId,
      })),
      createdBy: actorUserId,
    });
    await confirmMovement(movement._id, actorUserId);
    movementIds.push(movement._id);
  }

  job.pickMovementIds = [...(job.pickMovementIds ?? []), ...movementIds];
  job.pickupCheckedInAt = new Date();
  job.pickupCheckedInBy = actorUserId;
  job.status = 'picked_up';
  pushActivity(job, 'pickup_checked_in', actorUserId, note);
  job.markModified('lines');
  job.markModified('activities');
  await job.save();
  return job;
}

export async function confirmReturnCheckIn(
  jobId: Types.ObjectId,
  lines: ReturnCheckInLineInput[],
  note: string | undefined,
  actorUserId: Types.ObjectId
): Promise<ILogisticsJob> {
  await connectDB();
  const job = await LogisticsJob.findById(jobId);
  if (!job) throw new Error('Job not found');
  if (job.status !== 'picked_up') {
    throw new Error('Az esemény nincs visszaellenőrzésre kész állapotban.');
  }

  const products = await Product.find({ _id: { $in: job.lines.map((l) => l.productId) } })
    .select({ isConsumable: 1 })
    .lean()
    .exec();
  const consumableMap = new Map(products.map((p) => [String(p._id), Boolean(p.isConsumable)]));

  for (const input of lines) {
    const line = findLine(job, input.productId);
    const checked = Math.max(0, input.checkedQuantity);
    line.checkedQuantity = checked;
    line.returnedQuantity = checked;
    line.returnWarehouseId = input.returnWarehouseId ?? line.warehouseId;
    const isConsumable = consumableMap.get(String(line.productId)) ?? false;
    line.lostQuantity = isConsumable ? 0 : Math.max(0, line.gatheredQuantity - checked);
  }

  const grouped = new Map<string, Array<{ productId: Types.ObjectId; quantity: number }>>();
  for (const line of job.lines) {
    if (line.checkedQuantity <= 0 || !line.returnWarehouseId) continue;
    const key = String(line.returnWarehouseId);
    const list = grouped.get(key) ?? [];
    list.push({ productId: line.productId, quantity: line.checkedQuantity });
    grouped.set(key, list);
  }

  const movementIds: Types.ObjectId[] = [];
  for (const [warehouseId, groupLines] of grouped) {
    const toWarehouseId = new mongoose.Types.ObjectId(warehouseId);
    const movement = await createMovement({
      type: 'return',
      toWarehouseId,
      note: `Visszáru ${job.reference}`,
      lines: groupLines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        toWarehouseId,
      })),
      createdBy: actorUserId,
    });
    await confirmMovement(movement._id, actorUserId);
    movementIds.push(movement._id);
  }

  job.returnMovementIds = [...(job.returnMovementIds ?? []), ...movementIds];
  job.returnCheckedInAt = new Date();
  job.returnCheckedInBy = actorUserId;
  job.status = 'completed';
  pushActivity(job, 'return_checked_in', actorUserId, note);
  job.markModified('lines');
  job.markModified('activities');
  await job.save();
  return job;
}

export async function cancelLogisticsJob(
  jobId: Types.ObjectId,
  actorUserId: Types.ObjectId
): Promise<ILogisticsJob> {
  await connectDB();
  const job = await LogisticsJob.findById(jobId);
  if (!job) throw new Error('Job not found');
  if (job.status === 'picked_up' || job.status === 'completed') {
    throw new Error('Már elindult vagy lezárt esemény nem törölhető.');
  }

  job.status = 'cancelled';
  pushActivity(job, 'cancelled', actorUserId);
  job.markModified('activities');
  await job.save();
  await syncLogisticsJobToEmployeeSchedules(job, actorUserId);
  return job;
}

export async function submitJobFeedback(
  jobId: Types.ObjectId,
  employeeId: Types.ObjectId,
  message: string
): Promise<ILogisticsJob> {
  await connectDB();
  const job = await LogisticsJob.findById(jobId);
  if (!job) throw new Error('Job not found');
  const trimmed = message.trim();
  if (!trimmed) throw new Error('A visszajelzés nem lehet üres.');

  job.feedback = [
    ...(job.feedback ?? []),
    {
      _id: new mongoose.Types.ObjectId(),
      employeeId,
      message: trimmed,
      createdAt: new Date(),
    } as never,
  ];
  job.markModified('feedback');
  await job.save();
  return job;
}

export function jobRolesForEmployees(
  job: Pick<ILogisticsJob, 'pickupEmployeeId' | 'dropoffEmployeeId' | 'crewEmployeeIds'>,
  employeeIds: Types.ObjectId[]
): JobEmployeeRole[] {
  const wanted = new Set(employeeIds.map(String));
  const roles = new Set<JobEmployeeRole>();
  if (job.pickupEmployeeId && wanted.has(String(job.pickupEmployeeId))) roles.add('pickup');
  if (job.dropoffEmployeeId && wanted.has(String(job.dropoffEmployeeId))) roles.add('dropoff');
  if ((job.crewEmployeeIds ?? []).some((id) => wanted.has(String(id)))) roles.add('crew');
  return [...roles];
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
  topEmployeesByLoss: Array<{ employeeId: string; totalLost: number }>;
}> {
  await connectDB();

  const allJobs = await LogisticsJob.find().lean().exec();
  const completed = allJobs.filter((j) => j.status === 'completed');
  const activeStatuses: JobStatus[] = ['scheduled', 'picked_up'];
  const activeJobs = allJobs.filter((j) => activeStatuses.includes(j.status as JobStatus)).length;

  const productIds = new Set<string>();
  for (const job of completed) {
    for (const line of job.lines ?? []) {
      if (line.lostQuantity > 0) productIds.add(String(line.productId));
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
  const employeeLoss = new Map<string, number>();

  for (const job of completed) {
    let jobLost = 0;
    for (const line of job.lines ?? []) {
      totalGathered += line.gatheredQuantity;
      totalLost += line.lostQuantity;
      jobLost += line.lostQuantity;
      const prices = priceMap.get(String(line.productId)) ?? { huf: 0, eur: 0 };
      lostValueHuf += line.lostQuantity * prices.huf;
      lostValueEur += line.lostQuantity * prices.eur;
    }
    if (jobLost > 0) {
      const prev = siteLoss.get(job.siteAddress) ?? { eventName: job.eventName, totalLost: 0 };
      siteLoss.set(job.siteAddress, {
        eventName: job.eventName,
        totalLost: prev.totalLost + jobLost,
      });
      for (const empId of [job.pickupEmployeeId, job.dropoffEmployeeId].filter(Boolean)) {
        const key = String(empId);
        employeeLoss.set(key, (employeeLoss.get(key) ?? 0) + jobLost);
      }
    }
  }

  const topSitesByLoss = [...siteLoss.entries()]
    .map(([siteAddress, v]) => ({ siteAddress, eventName: v.eventName, totalLost: v.totalLost }))
    .sort((a, b) => b.totalLost - a.totalLost)
    .slice(0, 10);

  const topEmployeesByLoss = [...employeeLoss.entries()]
    .map(([employeeId, totalLost]) => ({ employeeId, totalLost }))
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
    topEmployeesByLoss,
  };
}
