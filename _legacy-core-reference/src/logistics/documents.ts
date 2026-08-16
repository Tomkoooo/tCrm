import {
  connectDB,
  LogisticsJob,
  Product,
  User,
  Vehicle,
  Warehouse,
  type ILogisticsJob,
} from '@crm/db';
import type { Types } from 'mongoose';
import { enrichPickupLinesDisplay } from './pickup-line-display';
import { getPickup, normalizeJobPickups, resolveJobPickups } from './job-pickups';

export type LogisticsPickupDocumentBomLine = {
  sku: string;
  name: string;
  quantityPerKit: number;
  totalQuantity: number;
  depth?: number;
  isAssembly?: boolean;
};

/** Structured payload for PDF templates / email HTML (no rendering here). */
export type LogisticsPickupDocumentLine = {
  sku: string;
  name: string;
  requestedQuantity: number;
  gatheredQuantity: number;
  installedQuantity: number;
  returnedQuantity: number;
  checkedQuantity: number;
  lostQuantity: number;
  isConsumable: boolean;
  isPrebuild: boolean;
  bomComponents: LogisticsPickupDocumentBomLine[];
};

export type LogisticsPickupDocumentPayload = {
  documentType: 'packing_list' | 'pickup_slip' | 'return_slip';
  generatedAt: string;
  job: {
    id: string;
    reference: string;
    eventName: string;
    siteAddress: string;
    note?: string;
  };
  pickup: {
    id: string;
    reference: string;
    label?: string;
    status: string;
    warehouse: { id: string; key: string; name: string };
    vehicle?: { id: string; name: string; plateNumber: string };
    team: Array<{ id: string; name: string; email: string }>;
    contactEmails: string[];
    note?: string;
  };
  lines: LogisticsPickupDocumentLine[];
};

/**
 * Build a serializable document model for PDF generation or email attachments.
 * Future: pass result to a PDF renderer and store URL on pickup.documents.
 */
export async function buildLogisticsPickupDocument(
  jobId: Types.ObjectId,
  pickupId: Types.ObjectId,
  documentType: LogisticsPickupDocumentPayload['documentType']
): Promise<LogisticsPickupDocumentPayload> {
  await connectDB();

  const job = await LogisticsJob.findById(jobId).lean<ILogisticsJob>().exec();
  if (!job) throw new Error('Job not found');

  const pickups = resolveJobPickups(job);
  const pickup = pickups.find((p) => p._id.equals(pickupId));
  if (!pickup) throw new Error('Pickup not found');

  const [warehouse, vehicle, teamUsers, products] = await Promise.all([
    Warehouse.findById(pickup.warehouseId).lean().exec(),
    pickup.vehicleId ? Vehicle.findById(pickup.vehicleId).lean().exec() : null,
    pickup.teamMemberIds.length
      ? User.find({ _id: { $in: pickup.teamMemberIds } })
          .select('name email')
          .lean()
          .exec()
      : [],
    Product.find({ _id: { $in: pickup.lines.map((l) => l.productId) } })
      .select({ sku: 1, names: 1, isConsumable: 1 })
      .lean()
      .exec(),
  ]);

  if (!warehouse) throw new Error('Warehouse not found');

  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const enriched = await enrichPickupLinesDisplay(
    pickup.lines.map((l) => ({ productId: l.productId, quantity: l.requestedQuantity }))
  );
  const enrichedMap = new Map(enriched.map((e) => [e.productId, e]));

  const lines: LogisticsPickupDocumentLine[] = pickup.lines.map((l) => {
    const p = productMap.get(String(l.productId));
    const bom = enrichedMap.get(String(l.productId));
    return {
      sku: p?.sku ?? bom?.sku ?? '—',
      name: p?.names?.hu ?? p?.names?.en ?? bom?.name ?? '—',
      requestedQuantity: l.requestedQuantity,
      gatheredQuantity: l.gatheredQuantity,
      installedQuantity: l.installedQuantity,
      returnedQuantity: l.returnedQuantity,
      checkedQuantity: l.checkedQuantity,
      lostQuantity: l.lostQuantity,
      isConsumable: Boolean(p?.isConsumable),
      isPrebuild: bom?.isPrebuild ?? false,
      bomComponents:
        bom?.bomComponents.map((c) => ({
          sku: c.sku,
          name: c.name,
          quantityPerKit: c.quantityPerKit,
          totalQuantity: c.totalQuantity,
          depth: c.depth,
          isAssembly: c.isAssembly,
        })) ?? [],
    };
  });

  return {
    documentType,
    generatedAt: new Date().toISOString(),
    job: {
      id: String(job._id),
      reference: job.reference,
      eventName: job.eventName,
      siteAddress: job.siteAddress,
      note: job.note,
    },
    pickup: {
      id: String(pickup._id),
      reference: pickup.reference,
      label: pickup.label,
      status: pickup.status,
      warehouse: {
        id: String(warehouse._id),
        key: warehouse.key,
        name: warehouse.name,
      },
      vehicle: vehicle
        ? {
            id: String(vehicle._id),
            name: vehicle.name,
            plateNumber: vehicle.plateNumber,
          }
        : undefined,
      team: teamUsers.map((u) => ({
        id: String(u._id),
        name: u.name ?? u.email,
        email: u.email,
      })),
      contactEmails: pickup.contactEmails ?? [],
      note: pickup.note,
    },
    lines,
  };
}

/** Stamp document generation time on pickup (call after PDF is stored). */
export async function markPickupDocumentGenerated(
  jobId: Types.ObjectId,
  pickupId: Types.ObjectId,
  documentType: LogisticsPickupDocumentPayload['documentType'],
  url?: string
): Promise<void> {
  await connectDB();
  const job = await LogisticsJob.findById(jobId);
  if (!job) throw new Error('Job not found');

  normalizeJobPickups(job);
  const pickup = getPickup(job, pickupId);
  const documents = pickup.documents ?? {};
  const now = new Date();

  switch (documentType) {
    case 'packing_list':
      documents.packingListGeneratedAt = now;
      if (url) documents.packingListUrl = url;
      break;
    case 'pickup_slip':
      documents.pickupSlipGeneratedAt = now;
      break;
    case 'return_slip':
      documents.returnSlipGeneratedAt = now;
      if (url) documents.returnSlipUrl = url;
      break;
  }

  pickup.documents = documents;
  job.markModified('pickups');
  await job.save();
}
