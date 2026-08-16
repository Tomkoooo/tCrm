import Link from 'next/link';
import mongoose from 'mongoose';
import { notFound } from 'next/navigation';
import { getCurrentUser, hasPermission, requireAnyPermission } from '@crm/auth';
import { LOGISTICS_READ_PERMISSION_KEYS } from '@crm/logistics/permissions';
import { connectDB, LogisticsJob, Product, User, Vehicle, Warehouse } from '@crm/db-core';
import {
  canAccessPickupWarehouse,
  enrichPickupLinesDisplay,
  hasGlobalLogisticsScope,
  normalizeJobPickups,
} from '@crm/logistics';
import { Container } from '@crm/ui';
import { Button } from '@crm/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@crm/ui';
import {
  JobWorkflowPanel,
  type JobLineView,
  type PickupView,
} from '../_components/job-workflow-panel';
import { JOB_STATUS_LABELS } from '../_components/job-status-labels';
import type { JobStatus } from '@crm/db-core';

export default async function LogisticsJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAnyPermission([...LOGISTICS_READ_PERMISSION_KEYS]);
  const canWrite = await hasPermission('logistics:write');
  const { id } = await params;
  await connectDB();

  const jobDoc = await LogisticsJob.findById(id).exec();
  if (!jobDoc) notFound();

  const job = jobDoc.toObject();
  normalizeJobPickups(job as Parameters<typeof normalizeJobPickups>[0]);

  const user = await getCurrentUser();
  if (user && !hasGlobalLogisticsScope(user.permissions)) {
    const userId = new mongoose.Types.ObjectId(user.id);
    let allowed = false;
    for (const pickup of job.pickups) {
      if (await canAccessPickupWarehouse(userId, user.permissions, pickup.warehouseId)) {
        allowed = true;
        break;
      }
    }
    if (!allowed) notFound();
  }

  const productIds = new Set<string>();
  for (const pickup of job.pickups) {
    for (const line of pickup.lines) {
      productIds.add(String(line.productId));
    }
  }

  const warehouseIds = [...new Set(job.pickups.map((p) => String(p.warehouseId)))];
  const vehicleIds = job.pickups
    .map((p) => p.vehicleId)
    .filter(Boolean)
    .map(String);
  const teamIds = [...new Set(job.pickups.flatMap((p) => p.teamMemberIds.map(String)))];

  const [products, warehouses, vehicles, teamUsers] = await Promise.all([
    Product.find({ _id: { $in: [...productIds] } })
      .select({ sku: 1, names: 1, isConsumable: 1 })
      .lean()
      .exec(),
    Warehouse.find({ _id: { $in: warehouseIds } })
      .select({ name: 1, key: 1 })
      .lean()
      .exec(),
    vehicleIds.length
      ? Vehicle.find({ _id: { $in: vehicleIds } })
          .select({ name: 1, plateNumber: 1 })
          .lean()
          .exec()
      : [],
    teamIds.length
      ? User.find({ _id: { $in: teamIds } })
          .select({ name: 1, email: 1 })
          .lean()
          .exec()
      : [],
  ]);

  const productMap = new Map(products.map((p) => [String(p._id), p]));
  const warehouseMap = new Map(warehouses.map((w) => [String(w._id), w]));
  const vehicleMap = new Map(vehicles.map((v) => [String(v._id), v]));
  const userMap = new Map(teamUsers.map((u) => [String(u._id), u]));

  const pickups: PickupView[] = await Promise.all(
    job.pickups.map(async (pickup) => {
      const enriched = await enrichPickupLinesDisplay(
        pickup.lines.map((l) => ({
          productId: l.productId,
          quantity: l.requestedQuantity,
        }))
      );
      const enrichedMap = new Map(enriched.map((e) => [e.productId, e]));

      const lines: JobLineView[] = pickup.lines.map((l) => {
        const p = productMap.get(String(l.productId));
        const bom = enrichedMap.get(String(l.productId));
        return {
          productId: String(l.productId),
          sku: p?.sku ?? bom?.sku ?? '—',
          name: p?.names?.hu ?? p?.names?.en ?? bom?.name ?? '—',
          isConsumable: Boolean(p?.isConsumable),
          isPrebuild: bom?.isPrebuild ?? false,
          bomComponents: bom?.bomComponents ?? [],
          requestedQuantity: l.requestedQuantity,
          gatheredQuantity: l.gatheredQuantity,
          installedQuantity: l.installedQuantity,
          installedLocation: l.installedLocation,
          returnedQuantity: l.returnedQuantity,
          checkedQuantity: l.checkedQuantity,
          lostQuantity: l.lostQuantity,
        };
      });

      const wh = warehouseMap.get(String(pickup.warehouseId));
      const veh = pickup.vehicleId ? vehicleMap.get(String(pickup.vehicleId)) : undefined;

      return {
        pickupId: String(pickup._id),
        reference: pickup.reference,
        label: pickup.label,
        warehouseName: wh ? `${wh.name} (${wh.key})` : '—',
        vehicleLabel: veh ? `${veh.name} (${veh.plateNumber})` : '—',
        teamLabels: pickup.teamMemberIds.map(
          (uid) => userMap.get(String(uid))?.name ?? userMap.get(String(uid))?.email ?? '—'
        ),
        status: pickup.status,
        contactEmails: pickup.contactEmails ?? [],
        pendingNotifications: pickup.notifications?.pendingKinds ?? [],
        lines,
      };
    })
  );

  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{job.reference}</h1>
          <p className="text-muted-foreground text-sm">
            {job.eventName} · {job.siteAddress}
          </p>
          <p className="text-sm">
            Állapot: {JOB_STATUS_LABELS[job.status as JobStatus] ?? job.status} · {pickups.length}{' '}
            átvételi kör
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/logistics/jobs">Vissza a listához</Link>
        </Button>
      </div>

      {job.note && (
        <Card>
          <CardContent className="text-muted-foreground pt-4 text-sm">{job.note}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Átvételek és munkafolyamat</CardTitle>
        </CardHeader>
        <CardContent>
          <JobWorkflowPanel
            jobId={id}
            jobStatus={job.status as JobStatus}
            pickups={pickups}
            canWrite={canWrite}
          />
        </CardContent>
      </Card>
    </Container>
  );
}
