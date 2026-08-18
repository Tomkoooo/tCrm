import Link from 'next/link';
import mongoose from 'mongoose';
import { notFound } from 'next/navigation';
import { getCurrentUser, hasPermission, hasAnyPermission } from '@crm/auth';
import { LOGISTICS_READ_PERMISSION_KEYS } from '@crm/logistics/permissions';
import { connectDB, LogisticsJob, Product, User, Vehicle, Warehouse, Employee } from '@crm/db-core';
import { listMembershipsForUser } from '@crm/hr';
import {
  canAccessPickupWarehouse,
  crewRolesOnJobForEmployees,
  enrichPickupLinesDisplay,
  hasGlobalLogisticsScope,
  normalizeJobPickups,
  previewDemandAvailability,
  previewPickupWarehouseIssues,
} from '@crm/logistics';
import { formatDateTime } from '@crm/lib';
import { Container } from '@crm/ui';
import { Button } from '@crm/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@crm/ui';
import { JobWorkflowPanel, type JobLineView } from '../_components/job-workflow-panel';
import { JobPlanPanel } from '../_components/job-plan-panel';
import { JOB_STATUS_LABELS } from '../_components/job-status-labels';
import type { CrewRole, JobPlanStatus, JobStatus } from '@crm/db-core';

export default async function LogisticsJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) notFound();
  const canWrite = await hasPermission('logistics:write');
  const { id } = await params;
  await connectDB();

  const jobDoc = await LogisticsJob.findById(id).exec();
  if (!jobDoc) notFound();

  const job = jobDoc.toObject();
  normalizeJobPickups(job as Parameters<typeof normalizeJobPickups>[0]);

  const memberships = await listMembershipsForUser(user.id);
  const membershipOids = memberships.map((m) => m._id);
  const membershipIds = new Set(membershipOids.map(String));
  const onCrew = (job.crew ?? []).some((c) => membershipIds.has(String(c.employeeId)));

  if (!hasGlobalLogisticsScope(user.permissions)) {
    let allowed = onCrew || canWrite;
    if (!allowed && (await hasAnyPermission([...LOGISTICS_READ_PERMISSION_KEYS]))) {
      const userId = new mongoose.Types.ObjectId(user.id);
      for (const pickup of job.pickups) {
        if (await canAccessPickupWarehouse(userId, user.permissions, pickup.warehouseId)) {
          allowed = true;
          break;
        }
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
  const collectDemandIds = (lines: typeof job.demandLines) => {
    for (const line of lines ?? []) {
      if (line.productId) productIds.add(String(line.productId));
      for (const component of line.kit?.components ?? []) {
        productIds.add(String(component.productId));
      }
    }
  };
  collectDemandIds(job.demandLines);
  collectDemandIds(job.originalDemandLines);
  for (const req of job.itemRequests ?? []) {
    if (req.productId) productIds.add(String(req.productId));
  }

  const warehouseIds = [...new Set(job.pickups.map((p) => String(p.warehouseId)))];
  const vehicleIds = job.pickups
    .map((p) => p.vehicleId)
    .filter(Boolean)
    .map(String);
  const teamIds = [...new Set(job.pickups.flatMap((p) => (p.teamMemberIds ?? []).map(String)))];
  const employeeIds = [
    ...new Set([
      ...job.pickups.flatMap((p) => (p.employeeIds ?? []).map(String)),
      ...(job.crew ?? []).map((c) => String(c.employeeId)),
    ]),
  ];

  const [products, warehouses, vehicles, allVehicles, teamUsers, employees] = await Promise.all([
    Product.find({ _id: { $in: [...productIds] } })
      .select({ sku: 1, names: 1, isConsumable: 1 })
      .lean()
      .exec(),
    Warehouse.find({
      $or: [{ isActive: true }, { _id: { $in: warehouseIds } }],
    })
      .select({ name: 1, key: 1, isActive: 1 })
      .sort({ name: 1 })
      .lean()
      .exec(),
    vehicleIds.length
      ? Vehicle.find({ _id: { $in: vehicleIds } })
          .select({ name: 1, plateNumber: 1 })
          .lean()
          .exec()
      : [],
    Vehicle.find({ isActive: true })
      .select({ name: 1, plateNumber: 1 })
      .sort({ name: 1 })
      .lean()
      .exec(),
    teamIds.length
      ? User.find({ _id: { $in: teamIds } })
          .select({ name: 1, email: 1 })
          .lean()
          .exec()
      : [],
    employeeIds.length
      ? Employee.find({ _id: { $in: employeeIds } })
          .select({ name: 1, email: 1 })
          .lean()
          .exec()
      : [],
  ]);

  const productMap = new Map(products.map((p) => [String(p._id), p]));
  const warehouseMap = new Map(warehouses.map((w) => [String(w._id), w]));
  const vehicleMap = new Map(vehicles.map((v) => [String(v._id), v]));
  const userMap = new Map(teamUsers.map((u) => [String(u._id), u]));
  const employeeMap = new Map(employees.map((e) => [String(e._id), e]));

  const [availability, warehouseIssues, pickups] = await Promise.all([
    previewDemandAvailability(job.demandLines ?? []),
    previewPickupWarehouseIssues(
      job.pickups.map((pickup) => ({
        warehouseId: pickup.warehouseId,
        lines: pickup.lines.map((l) => ({
          productId: l.productId,
          requestedQuantity: l.requestedQuantity,
        })),
      }))
    ),
    Promise.all(
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
            isOptional: Boolean(l.isOptional),
            bomComponents: bom?.bomComponents ?? [],
            requestedQuantity: l.requestedQuantity,
            gatheredQuantity: l.gatheredQuantity,
            installedQuantity: l.installedQuantity,
            installedLocation: l.installedLocation,
            returnedQuantity: l.returnedQuantity,
            checkedQuantity: l.checkedQuantity,
            lostQuantity: l.lostQuantity,
            inboundHandoffQuantity: l.inboundHandoffQuantity,
          };
        });

        const wh = warehouseMap.get(String(pickup.warehouseId));
        const veh = pickup.vehicleId ? vehicleMap.get(String(pickup.vehicleId)) : undefined;

        return {
          pickupId: String(pickup._id),
          reference: pickup.reference,
          label: pickup.label,
          warehouseId: String(pickup.warehouseId),
          warehouseName: wh ? `${wh.name} (${wh.key})` : '—',
          vehicleLabel: veh ? `${veh.name} (${veh.plateNumber})` : '—',
          teamLabels:
            (pickup.employeeIds?.length
              ? pickup.employeeIds.map((eid) => {
                  const e = employeeMap.get(String(eid));
                  return e ? (e.email ? `${e.name} · ${e.email}` : e.name) : '—';
                })
              : pickup.teamMemberIds.map(
                  (uid) => userMap.get(String(uid))?.name ?? userMap.get(String(uid))?.email ?? '—'
                )) ?? [],
          status: pickup.status,
          contactEmails: pickup.contactEmails ?? [],
          pendingNotifications: pickup.notifications?.pendingKinds ?? [],
          lines,
        };
      })
    ),
  ]);

  const crewRoles: CrewRole[] = crewRolesOnJobForEmployees(job as typeof jobDoc, membershipOids);
  const isDirector = canWrite || crewRoles.includes('director');
  const planStatus: JobPlanStatus = job.planStatus ?? (job.pickups.length ? 'locked' : 'draft');

  const demandView = (job.demandLines ?? []).map((l, index) => {
    const p = l.productId ? productMap.get(String(l.productId)) : undefined;
    const avail = availability[index];
    const kitComponents = (l.kit?.components ?? []).map((c) => {
      const cp = productMap.get(String(c.productId));
      return {
        sku: cp?.sku ?? '—',
        name: cp?.names?.hu ?? cp?.names?.en ?? '—',
        quantity: c.quantity,
      };
    });
    const availComponents = (avail?.components ?? []).map((c) => ({
      sku: c.sku === c.productId ? '—' : c.sku,
      name: c.name === c.productId ? 'Ismeretlen tétel' : c.name,
      quantity: c.quantityPerKit,
      shortage: c.shortage,
    }));
    return {
      id: l.productId ? String(l.productId) : `kit-${index}`,
      productId: l.productId ? String(l.productId) : undefined,
      sku:
        (p?.sku && p.sku !== String(l.productId) ? p.sku : undefined) ?? (l.kit ? 'egyedi' : '—'),
      name:
        l.kit?.name ||
        p?.names?.hu ||
        p?.names?.en ||
        (avail?.name && avail.name !== avail.productId ? avail.name : undefined) ||
        'Egyedi összeállítás',
      requestedQuantity: l.requestedQuantity,
      isOptional: l.isOptional,
      substitutionNote: l.kit?.substitutionNote,
      kitOverridden: Boolean(l.kit?.components?.length),
      available: avail?.available,
      shortage: avail?.shortage,
      components: availComponents.length ? availComponents : kitComponents,
    };
  });
  const originalView = (job.originalDemandLines ?? []).map((l, index) => {
    const p = l.productId ? productMap.get(String(l.productId)) : undefined;
    return {
      id: l.productId ? String(l.productId) : `orig-kit-${index}`,
      productId: l.productId ? String(l.productId) : undefined,
      sku: p?.sku ?? (l.kit ? 'egyedi' : '—'),
      name: l.kit?.name || p?.names?.hu || p?.names?.en || 'Egyedi összeállítás',
      requestedQuantity: l.requestedQuantity,
      isOptional: l.isOptional,
      substitutionNote: l.kit?.substitutionNote,
      kitOverridden: Boolean(l.kit?.components?.length),
      components: (l.kit?.components ?? []).map((c) => {
        const cp = productMap.get(String(c.productId));
        return {
          sku: cp?.sku ?? '—',
          name: cp?.names?.hu ?? cp?.names?.en ?? '—',
          quantity: c.quantity,
        };
      }),
    };
  });

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
          <CardTitle className="text-base">Igénylista, csapat, terv</CardTitle>
        </CardHeader>
        <CardContent>
          <JobPlanPanel
            jobId={id}
            planStatus={planStatus}
            demand={demandView}
            originalDemand={originalView}
            crew={(job.crew ?? []).map((c) => ({
              employeeId: String(c.employeeId),
              name: employeeMap.get(String(c.employeeId))?.name ?? '—',
              roles: c.roles,
            }))}
            activities={(job.activities ?? [])
              .slice()
              .reverse()
              .slice(0, 20)
              .map((a) => ({
                id: String(a._id),
                kind: a.kind,
                at: formatDateTime(a.at, 'hu-HU'),
                message: a.message,
              }))}
            itemRequests={(job.itemRequests ?? []).map((r) => {
              const p = r.productId ? productMap.get(String(r.productId)) : undefined;
              return {
                id: String(r._id),
                note: r.note,
                status: r.status,
                quantity: r.quantity,
                productLabel: p ? `${p.names?.hu ?? p.names?.en ?? p.sku}` : undefined,
              };
            })}
            feedback={job.feedback}
            vehicles={allVehicles.map((v) => ({
              id: String(v._id),
              name: v.name,
              plateNumber: v.plateNumber,
            }))}
            pickupVehicles={job.pickups.map((p) => ({
              pickupId: String(p._id),
              label: p.label || p.reference,
              vehicleId: p.vehicleId ? String(p.vehicleId) : undefined,
              warning: p.vehicleWarning,
            }))}
            warehouseIssues={warehouseIssues.map((issue) => ({
              warehouseName: issue.warehouseName,
              sku: issue.sku,
              name: issue.name,
              requested: issue.requested,
              available: issue.available,
            }))}
            canWrite={canWrite}
            isDirector={isDirector}
          />
        </CardContent>
      </Card>

      {pickups.length > 0 && (
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
              crewRoles={crewRoles}
              warehouses={warehouses.map((w) => ({ id: String(w._id), name: w.name }))}
              substitutionNotes={demandView
                .filter((l) => l.substitutionNote)
                .map((l) => ({ name: l.name, note: l.substitutionNote! }))}
            />
          </CardContent>
        </Card>
      )}
    </Container>
  );
}
