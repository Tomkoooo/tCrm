import {
  connectDB,
  LogisticsJob,
  Product,
  Reservation,
  StockLevel,
  Vehicle,
  Warehouse,
  type CrewRole,
  type IDemandLine,
  type IDemandKit,
  type IJobActivity,
  type IJobCrewMember,
  type ILogisticsJob,
  type JobActivityKind,
} from '@crm/db-core';
import mongoose, { type Types } from 'mongoose';
import { resolveUserIdsFromEmployees } from '@crm/hr';
import { availableQty } from './stock-helpers';
import { createReservation, releaseReservation } from './reservations';
import { formatPickupReference } from './job-references';
import { generateJobReference } from './job-references';
import { enqueueLogisticsNotification } from './notifications';
import { resolveJobWindows, resolveWindowsFromDates } from './job-windows';
import { explodeDemandLines } from './demand-explode';
import { syncLogisticsJobToEmployeeSchedules } from './logistics-schedule-sync';
import { normalizeJobPickups, syncJobStatusFromPickups } from './job-pickups';
import { assertValidCrew, pickupCrewEmployeeIds } from './crew';
import {
  createVehicleBooking,
  cancelVehicleBookingsForJob,
  isVehicleBooked,
} from './vehicle-bookings';
import {
  proposePickupRounds,
  type OptimizerDemandLine,
  type OptimizerStockSlice,
  type OptimizerVehicle,
} from './optimize-pickups';

export type DemandLineInput = {
  productId?: Types.ObjectId;
  requestedQuantity: number;
  isOptional?: boolean;
  note?: string;
  kit?: IDemandKit;
};

export type CrewMemberInput = {
  employeeId: Types.ObjectId;
  roles: CrewRole[];
};

export type CreateDemandJobParams = {
  eventName: string;
  siteAddress: string;
  plannedEventAt?: Date;
  plannedGatherAt?: Date;
  plannedReturnAt?: Date;
  note?: string;
  demandLines: DemandLineInput[];
  crew: CrewMemberInput[];
  createdBy: Types.ObjectId;
  pickups?: DraftPickupRoundInput[];
};

export type DraftPickupRoundInput = {
  warehouseId: Types.ObjectId;
  vehicleId?: Types.ObjectId;
  vehicleWarning?: string;
  lines: Array<{
    productId: Types.ObjectId;
    requestedQuantity: number;
    isOptional?: boolean;
  }>;
};

function pushActivity(
  job: ILogisticsJob,
  kind: JobActivityKind,
  actorUserId: Types.ObjectId,
  message?: string
) {
  const row = {
    _id: new mongoose.Types.ObjectId(),
    kind,
    at: new Date(),
    actorUserId,
    message,
  } as IJobActivity;
  job.activities = [...(job.activities ?? []), row];
}

export async function createDemandJob(params: CreateDemandJobParams): Promise<ILogisticsJob> {
  await connectDB();
  if (!params.demandLines.length) {
    throw new Error('Legalább egy tétel kell az igénylistára.');
  }
  assertValidCrew(params.crew);

  const reference = await generateJobReference();
  const windows = resolveWindowsFromDates({
    plannedEventAt: params.plannedEventAt,
    plannedGatherAt: params.plannedGatherAt,
    plannedReturnAt: params.plannedReturnAt,
  });
  const crewIds = params.crew
    .filter((m) => m.roles.some((r) => r === 'pickup' || r === 'driver' || r === 'dropoff'))
    .map((m) => m.employeeId);
  const pickupEmployeeIds = crewIds.length ? crewIds : params.crew.map((m) => m.employeeId);
  const teamMemberIds = await resolveUserIdsFromEmployees(pickupEmployeeIds);

  const pickups = (params.pickups ?? []).map((round, index) => ({
    _id: new mongoose.Types.ObjectId(),
    reference: formatPickupReference(reference, index + 1),
    warehouseId: round.warehouseId,
    vehicleId: round.vehicleId,
    vehicleWarning: round.vehicleWarning,
    employeeIds: pickupEmployeeIds,
    teamMemberIds,
    status: 'draft' as const,
    lines: round.lines.map((l) => ({
      productId: l.productId,
      requestedQuantity: l.requestedQuantity,
      isOptional: l.isOptional,
      gatheredQuantity: 0,
      installedQuantity: 0,
      returnedQuantity: 0,
      checkedQuantity: 0,
      lostQuantity: 0,
    })),
    notifications: {},
    documents: {},
    plannedGatherAt: windows.gather,
    plannedEventAt: windows.event,
    plannedReturnAt: windows.returnAt,
  }));

  const [job] = await LogisticsJob.create([
    {
      reference,
      eventName: params.eventName,
      siteAddress: params.siteAddress,
      plannedEventAt: params.plannedEventAt,
      plannedGatherAt: params.plannedGatherAt,
      plannedReturnAt: params.plannedReturnAt,
      note: params.note,
      status: 'draft',
      planStatus: pickups.length ? 'proposed' : 'draft',
      demandLines: params.demandLines,
      originalDemandLines: [],
      crew: params.crew,
      pickups,
      activities: [
        {
          kind: 'demand_created',
          at: new Date(),
          actorUserId: params.createdBy,
          message: `${params.demandLines.length} tétel, ${params.crew.length} fő${
            pickups.length ? `, ${pickups.length} kör` : ''
          }`,
        },
      ],
      createdBy: params.createdBy,
    },
  ]);

  await syncLogisticsJobToEmployeeSchedules(job, params.createdBy);
  return job;
}

function catalogProductLabel(p: { sku?: string; names?: { hu?: string; en?: string } }): {
  sku: string;
  name: string;
} {
  const sku = p.sku?.trim() || '—';
  const name = p.names?.hu?.trim() || p.names?.en?.trim() || sku;
  return { sku, name };
}

async function loadOptimizerInputs(
  demand: IDemandLine[],
  windowStart: Date,
  windowEnd: Date,
  ignoreJobId?: Types.ObjectId
): Promise<{
  demand: OptimizerDemandLine[];
  stock: OptimizerStockSlice[];
  vehicles: OptimizerVehicle[];
  products: Array<{ id: string; sku: string; name: string }>;
}> {
  const productIds = [
    ...demand.map((d) => d.productId).filter(Boolean),
    ...demand.flatMap((d) => (d.kit?.components ?? []).map((c) => c.productId)),
  ] as Types.ObjectId[];
  const [products, vehicles] = await Promise.all([
    Product.find({ _id: { $in: productIds } })
      .lean()
      .exec(),
    Vehicle.find({ isActive: true }).lean().exec(),
  ]);
  const productMap = new Map(products.map((p) => [String(p._id), p]));
  const physical = explodeDemandLines(demand, productMap);
  const physicalIds = physical.map((d) => d.productId);
  const missing = physicalIds.filter((id) => !productMap.has(String(id)));
  if (missing.length) {
    const extraProducts = await Product.find({ _id: { $in: missing } })
      .lean()
      .exec();
    for (const p of extraProducts) productMap.set(String(p._id), p);
  }

  const levels = physicalIds.length
    ? await StockLevel.find({ productId: { $in: physicalIds } })
        .lean()
        .exec()
    : [];

  const demandOpt: OptimizerDemandLine[] = physical.map((d) => {
    const p = productMap.get(String(d.productId));
    const volume =
      p?.packageVolumeM3 && p.packageVolumeM3 > 0
        ? p.packageVolumeM3
        : p?.dimensionsMm?.length && p.dimensionsMm.width && p.dimensionsMm.height
          ? (p.dimensionsMm.length * p.dimensionsMm.width * p.dimensionsMm.height) / 1_000_000_000
          : 0;
    return {
      productId: String(d.productId),
      requestedQuantity: d.requestedQuantity,
      isOptional: d.isOptional,
      weightKg: p?.packageWeightKg ?? p?.weightKg ?? 0,
      volumeM3: volume,
      lengthMm: p?.dimensionsMm?.length ?? 0,
      widthMm: p?.dimensionsMm?.width ?? 0,
      heightMm: p?.dimensionsMm?.height ?? 0,
    };
  });

  const stock: OptimizerStockSlice[] = levels.map((l) => ({
    productId: String(l.productId),
    warehouseId: String(l.warehouseId),
    available: availableQty({ onHand: l.onHand, reserved: l.reserved }),
  }));

  const vehicleOpts: OptimizerVehicle[] = [];
  for (const v of vehicles) {
    const booked = await isVehicleBooked(v._id, windowStart, windowEnd, ignoreJobId);
    vehicleOpts.push({
      vehicleId: String(v._id),
      maxWeightKg: v.maxWeightKg,
      maxVolumeM3: v.maxVolumeM3,
      lengthMm: v.lengthMm,
      widthMm: v.widthMm,
      heightMm: v.heightMm,
      booked,
    });
  }

  return {
    demand: demandOpt,
    stock,
    vehicles: vehicleOpts,
    products: [...productMap.entries()].map(([id, p]) => ({
      id,
      ...catalogProductLabel(p),
    })),
  };
}

export type PreviewPickupPlanResult = {
  rounds: Array<{
    warehouseId: string;
    warehouseName: string;
    warehouseKey: string;
    vehicleId?: string;
    vehicleLabel?: string;
    vehicleWarning?: string;
    lines: Array<{
      productId: string;
      sku: string;
      name: string;
      requestedQuantity: number;
      isOptional?: boolean;
    }>;
  }>;
  shortages: Array<{
    productId: string;
    sku: string;
    name: string;
    requested: number;
    allocated: number;
  }>;
  warnings: string[];
  warehouses: Array<{ id: string; name: string; key: string }>;
  vehicles: Array<{ id: string; name: string; plateNumber: string }>;
  products: Array<{ id: string; sku: string; name: string }>;
  stock: Array<{ productId: string; warehouseId: string; available: number }>;
  demand: Array<{ productId: string; requested: number; isOptional?: boolean }>;
};

export async function previewPickupPlan(params: {
  demandLines: DemandLineInput[];
  plannedEventAt?: Date;
  plannedGatherAt?: Date;
  plannedReturnAt?: Date;
}): Promise<PreviewPickupPlanResult> {
  await connectDB();
  if (!params.demandLines.length) {
    throw new Error('Legalább egy tétel kell az igénylistára.');
  }
  const windows = resolveWindowsFromDates(params);
  const inputs = await loadOptimizerInputs(params.demandLines, windows.gather, windows.returnAt);
  const proposal = proposePickupRounds(inputs.demand, inputs.stock, inputs.vehicles);

  const [warehouses, vehicles] = await Promise.all([
    Warehouse.find({ isActive: true }).select({ name: 1, key: 1 }).sort({ name: 1 }).lean().exec(),
    Vehicle.find({ isActive: true })
      .select({ name: 1, plateNumber: 1 })
      .sort({ name: 1 })
      .lean()
      .exec(),
  ]);
  const warehouseMap = new Map(warehouses.map((w) => [String(w._id), w]));
  const vehicleMap = new Map(vehicles.map((v) => [String(v._id), v]));

  const productById = new Map(inputs.products.map((p) => [p.id, p]));
  const extraIds = [
    ...new Set([
      ...proposal.rounds.flatMap((r) => r.lines.map((l) => l.productId)),
      ...proposal.shortages.map((s) => s.productId),
      ...inputs.demand.map((d) => d.productId),
    ]),
  ].filter((id) => !productById.has(id) && mongoose.Types.ObjectId.isValid(id));
  if (extraIds.length) {
    const extra = await Product.find({
      _id: { $in: extraIds.map((id) => new mongoose.Types.ObjectId(id)) },
    })
      .select({ sku: 1, names: 1 })
      .lean()
      .exec();
    for (const p of extra) {
      productById.set(String(p._id), { id: String(p._id), ...catalogProductLabel(p) });
    }
  }
  const products = [...productById.values()];
  const labelOf = (id: string) => {
    const p = productById.get(id);
    return {
      sku: p?.sku ?? '—',
      name: p?.name ?? 'Ismeretlen tétel',
    };
  };

  return {
    rounds: proposal.rounds.map((round) => {
      const wh = warehouseMap.get(round.warehouseId);
      const veh = round.vehicleId ? vehicleMap.get(round.vehicleId) : undefined;
      return {
        warehouseId: round.warehouseId,
        warehouseName: wh?.name ?? '—',
        warehouseKey: wh?.key ?? '',
        vehicleId: round.vehicleId,
        vehicleLabel: veh ? `${veh.name} (${veh.plateNumber})` : undefined,
        vehicleWarning: round.vehicleWarning,
        lines: round.lines.map((l) => ({
          productId: l.productId,
          ...labelOf(l.productId),
          requestedQuantity: l.requestedQuantity,
          isOptional: l.isOptional,
        })),
      };
    }),
    shortages: proposal.shortages.map((s) => ({
      productId: s.productId,
      ...labelOf(s.productId),
      requested: s.requested,
      allocated: s.allocated,
    })),
    warnings: proposal.warnings.filter((w) => !w.startsWith('Hiány: termék')),
    warehouses: warehouses.map((w) => ({ id: String(w._id), name: w.name, key: w.key })),
    vehicles: vehicles.map((v) => ({
      id: String(v._id),
      name: v.name,
      plateNumber: v.plateNumber,
    })),
    products,
    stock: inputs.stock,
    demand: inputs.demand.map((d) => ({
      productId: d.productId,
      requested: d.requestedQuantity,
      isOptional: d.isOptional,
    })),
  };
}

export async function proposeJobPlan(
  jobId: Types.ObjectId,
  actorUserId: Types.ObjectId
): Promise<ILogisticsJob> {
  await connectDB();
  const job = await LogisticsJob.findById(jobId);
  if (!job) throw new Error('Job not found');
  if (job.status === 'cancelled') throw new Error('Törölt eseményt nem lehet tervezni.');
  if (job.planStatus === 'locked') {
    throw new Error('A zárolt tervet előbb fel kell oldani, vagy újra kell generálni.');
  }
  if (!job.demandLines?.length) {
    throw new Error('Nincs igénylista.');
  }

  const windows = resolveJobWindows(job);
  const inputs = await loadOptimizerInputs(
    job.demandLines,
    windows.gather,
    windows.returnAt,
    job._id
  );
  const proposal = proposePickupRounds(inputs.demand, inputs.stock, inputs.vehicles);

  const crewIds = pickupCrewEmployeeIds(job);
  const teamMemberIds = await resolveUserIdsFromEmployees(crewIds);

  job.pickups.splice(0, job.pickups.length);
  for (const round of proposal.rounds) {
    const index = job.pickups.length;
    job.pickups.push({
      _id: new mongoose.Types.ObjectId(),
      reference: formatPickupReference(job.reference, index + 1),
      warehouseId: new mongoose.Types.ObjectId(round.warehouseId),
      vehicleId: round.vehicleId ? new mongoose.Types.ObjectId(round.vehicleId) : undefined,
      vehicleWarning: round.vehicleWarning,
      employeeIds: crewIds,
      teamMemberIds,
      status: 'draft',
      lines: round.lines.map((l) => ({
        productId: new mongoose.Types.ObjectId(l.productId),
        requestedQuantity: l.requestedQuantity,
        isOptional: l.isOptional,
        gatheredQuantity: 0,
        installedQuantity: 0,
        returnedQuantity: 0,
        checkedQuantity: 0,
        lostQuantity: 0,
      })),
      notifications: {},
      documents: {},
      plannedGatherAt: windows.gather,
      plannedEventAt: windows.event,
      plannedReturnAt: windows.returnAt,
    });
  }

  job.planStatus = 'proposed';
  const shortageNotes = proposal.shortages.map((s) => {
    const p = inputs.products.find((row) => row.id === s.productId);
    const label = p ? `${p.name} · ${p.sku}` : 'tétel';
    return `Hiány: ${label} — kért ${s.requested}, kiosztva ${s.allocated}`;
  });
  const warningText =
    [...proposal.warnings.filter((w) => !w.startsWith('Hiány: termék')), ...shortageNotes].join(
      ' '
    ) || undefined;
  pushActivity(job, 'plan_proposed', actorUserId, warningText);
  job.markModified('pickups');
  job.markModified('activities');
  await job.save();
  await syncLogisticsJobToEmployeeSchedules(job, actorUserId);
  return job;
}

async function releaseEventReservations(jobId: Types.ObjectId, userId: Types.ObjectId) {
  const active = await Reservation.find({
    sourceType: 'event',
    sourceId: jobId,
    status: 'active',
  }).exec();
  for (const r of active) {
    await releaseReservation(r._id, 'cancelled', userId);
  }
}

export async function lockJobPlan(
  jobId: Types.ObjectId,
  actorUserId: Types.ObjectId
): Promise<ILogisticsJob> {
  await connectDB();
  const job = await LogisticsJob.findById(jobId);
  if (!job) throw new Error('Job not found');
  if (job.status === 'cancelled') throw new Error('Törölt eseményt nem lehet zárolni.');
  normalizeJobPickups(job);
  if (!job.pickups.length) {
    throw new Error('Előbb javasolj átvételi köröket.');
  }

  const windows = resolveJobWindows(job);
  await releaseEventReservations(job._id, actorUserId);
  await cancelVehicleBookingsForJob(job._id);

  const notifyPickupIds: Types.ObjectId[] = [];
  for (const pickup of job.pickups) {
    for (const line of pickup.lines) {
      await createReservation({
        productId: line.productId,
        warehouseId: pickup.warehouseId,
        quantity: line.requestedQuantity,
        sourceType: 'event',
        sourceId: job._id,
        sourceRef: pickup.reference,
        note: `${job.reference} ${pickup.reference}`,
        createdBy: actorUserId,
      });
    }
    if (pickup.vehicleId) {
      const booking = await createVehicleBooking({
        vehicleId: pickup.vehicleId,
        jobId: job._id,
        pickupId: pickup._id,
        start: windows.gather,
        end: windows.returnAt,
        lastKnownPlace: 'warehouse',
        lastKnownWarehouseId: pickup.warehouseId,
        createdBy: actorUserId,
      });
      pickup.vehicleBookingId = booking._id;
    }
    if (pickup.status === 'draft') {
      pickup.status = 'scheduled';
      pickup.scheduledAt = new Date();
      notifyPickupIds.push(pickup._id);
    }
  }

  if (!job.originalDemandLines?.length) {
    job.originalDemandLines = job.demandLines.map((l) => ({
      productId: l.productId,
      requestedQuantity: l.requestedQuantity,
      isOptional: l.isOptional,
      note: l.note,
      kit: l.kit
        ? {
            name: l.kit.name,
            substitutionNote: l.kit.substitutionNote,
            components: (l.kit.components ?? []).map((c) => ({
              productId: c.productId,
              quantity: c.quantity,
              note: c.note,
            })),
          }
        : undefined,
    }));
  }

  job.planStatus = 'locked';
  job.scheduledAt = new Date();
  syncJobStatusFromPickups(job);
  pushActivity(job, 'plan_locked', actorUserId);
  job.markModified('pickups');
  job.markModified('originalDemandLines');
  job.markModified('activities');
  await job.save();

  for (const pickupId of notifyPickupIds) {
    await enqueueLogisticsNotification({
      kind: 'job_scheduled',
      jobId: job._id,
      pickupId,
      actorUserId,
    });
  }

  await syncLogisticsJobToEmployeeSchedules(job, actorUserId);
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
  if (!demandLines.length) throw new Error('Az igénylista nem lehet üres.');
  if (job.planStatus === 'locked') {
    job.planStatus = 'proposed';
  }
  job.demandLines = demandLines;
  pushActivity(job, 'demand_changed', actorUserId, `${demandLines.length} tétel`);
  job.markModified('demandLines');
  job.markModified('activities');
  await job.save();
  return job;
}

export async function requestJobItems(
  jobId: Types.ObjectId,
  params: {
    note: string;
    productId?: Types.ObjectId;
    quantity?: number;
    actorUserId: Types.ObjectId;
  }
): Promise<ILogisticsJob> {
  await connectDB();
  const job = await LogisticsJob.findById(jobId);
  if (!job) throw new Error('Job not found');
  job.itemRequests = [
    ...(job.itemRequests ?? []),
    {
      _id: new mongoose.Types.ObjectId(),
      productId: params.productId,
      quantity: params.quantity,
      note: params.note,
      status: 'pending',
      requestedByUserId: params.actorUserId,
      createdAt: new Date(),
    },
  ];
  pushActivity(job, 'item_request', params.actorUserId, params.note);
  job.markModified('itemRequests');
  job.markModified('activities');
  await job.save();
  return job;
}

export async function resolveJobItemRequest(
  jobId: Types.ObjectId,
  requestId: Types.ObjectId,
  decision: 'accepted' | 'rejected',
  actorUserId: Types.ObjectId
): Promise<ILogisticsJob> {
  await connectDB();
  const job = await LogisticsJob.findById(jobId);
  if (!job) throw new Error('Job not found');
  const req = (job.itemRequests ?? []).find((r) => r._id.equals(requestId));
  if (!req) throw new Error('A kérés nem található.');
  if (req.status !== 'pending') throw new Error('Ez a kérés már el lett bírálva.');
  req.status = decision;
  req.resolvedByUserId = actorUserId;
  req.resolvedAt = new Date();

  if (decision === 'accepted' && req.productId && req.quantity && req.quantity > 0) {
    const existing = job.demandLines.find((l) => l.productId?.equals(req.productId!));
    if (existing) existing.requestedQuantity += req.quantity;
    else {
      job.demandLines.push({
        productId: req.productId,
        requestedQuantity: req.quantity,
      });
    }
    if (job.planStatus === 'locked') job.planStatus = 'proposed';
    pushActivity(job, 'demand_changed', actorUserId, 'Tételkérés elfogadva');
  }

  pushActivity(
    job,
    'item_request_resolved',
    actorUserId,
    decision === 'accepted' ? 'Elfogadva' : 'Elutasítva'
  );
  job.markModified('itemRequests');
  job.markModified('demandLines');
  job.markModified('activities');
  await job.save();
  return job;
}

export async function submitJobFeedback(
  jobId: Types.ObjectId,
  feedback: string,
  actorUserId: Types.ObjectId
): Promise<ILogisticsJob> {
  await connectDB();
  const job = await LogisticsJob.findById(jobId);
  if (!job) throw new Error('Job not found');
  job.feedback = feedback.trim();
  pushActivity(job, 'feedback', actorUserId, job.feedback.slice(0, 200));
  job.markModified('activities');
  await job.save();
  return job;
}

export async function updatePickupVehicle(
  jobId: Types.ObjectId,
  pickupId: Types.ObjectId,
  vehicleId: Types.ObjectId | null,
  actorUserId: Types.ObjectId
): Promise<ILogisticsJob> {
  await connectDB();
  const job = await LogisticsJob.findById(jobId);
  if (!job) throw new Error('Job not found');
  const pickup = job.pickups.find((p) => p._id.equals(pickupId));
  if (!pickup) throw new Error('Pickup not found');
  pickup.vehicleId = vehicleId ?? undefined;
  pickup.vehicleWarning = undefined;
  pushActivity(job, 'plan_proposed', actorUserId, 'Jármű csere');
  job.markModified('pickups');
  job.markModified('activities');
  await job.save();
  return job;
}

export function crewRolesOnJob(job: ILogisticsJob, employeeId: Types.ObjectId): CrewRole[] {
  return job.crew.find((m) => m.employeeId.equals(employeeId))?.roles ?? [];
}

export function crewRolesOnJobForEmployees(
  job: ILogisticsJob,
  employeeIds: Types.ObjectId[]
): CrewRole[] {
  const wanted = new Set(employeeIds.map(String));
  const roles = new Set<CrewRole>();
  for (const member of job.crew ?? []) {
    if (!wanted.has(String(member.employeeId))) continue;
    for (const role of member.roles) roles.add(role);
  }
  return [...roles];
}

/** Used by gather to attach event reservations to pick lines. */
export async function findEventReservation(
  jobId: Types.ObjectId,
  productId: Types.ObjectId,
  warehouseId: Types.ObjectId
) {
  return Reservation.findOne({
    sourceType: 'event',
    sourceId: jobId,
    productId,
    warehouseId,
    status: 'active',
  }).exec();
}

export { resolveJobWindows } from './job-windows';
export type { IJobCrewMember };
