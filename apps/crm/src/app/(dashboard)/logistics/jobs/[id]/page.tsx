import Link from 'next/link';
import mongoose from 'mongoose';
import { notFound } from 'next/navigation';
import { getCurrentUser, hasPermission } from '@crm/auth';
import { connectDB, Employee, LogisticsJob, Product, Vehicle, Warehouse } from '@crm/db-core';
import { listMembershipsForUser } from '@crm/hr';
import {
  enrichJobLinesDisplay,
  jobRolesForEmployees,
  previewDemandAvailability,
} from '@crm/logistics';
import { formatDateTime } from '@crm/lib';
import { Container, Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@crm/ui';
import { JOB_STATUS_LABELS } from '../_components/job-status-labels';
import { PickupLinesList, type PickupLineListItem } from '../_components/pickup-lines-list';
import { EmployeesPanel } from '../_components/employees-panel';
import { JobActionsBar } from '../_components/job-actions-bar';
import { FeedbackPanel } from '../_components/feedback-panel';
import { DemandEditPanel } from '../_components/demand-edit-panel';
import { PickupCheckInForm } from '../_components/pickup-checkin-form';
import { ReturnCheckInForm } from '../_components/return-checkin-form';
import type { DemandLineDraft } from '../_components/job-create-types';

export default async function LogisticsJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) notFound();
  const { id } = await params;
  await connectDB();

  const jobDoc = await LogisticsJob.findById(id).lean().exec();
  if (!jobDoc) notFound();

  const canWrite = await hasPermission('logistics:write');
  const memberships = await listMembershipsForUser(user.id);
  const membershipIds = memberships.map((m) => m._id);
  const roles = jobRolesForEmployees(jobDoc, membershipIds);
  if (!canWrite && !roles.length) notFound();

  const productIds = new Set<string>();
  for (const line of jobDoc.demandLines ?? []) {
    if (line.productId) productIds.add(String(line.productId));
    for (const c of line.kit?.components ?? []) productIds.add(String(c.productId));
  }
  for (const line of jobDoc.lines ?? []) productIds.add(String(line.productId));

  const employeeIds = [
    ...new Set(
      [
        jobDoc.pickupEmployeeId,
        jobDoc.dropoffEmployeeId,
        ...(jobDoc.crewEmployeeIds ?? []),
        ...(jobDoc.feedback ?? []).map((f) => f.employeeId),
      ]
        .filter(Boolean)
        .map(String)
    ),
  ];
  const warehouseIds = new Set<string>();
  for (const line of jobDoc.lines ?? []) {
    if (line.warehouseId) warehouseIds.add(String(line.warehouseId));
    if (line.returnWarehouseId) warehouseIds.add(String(line.returnWarehouseId));
  }
  for (const line of jobDoc.demandLines ?? []) {
    if (line.warehouseId) warehouseIds.add(String(line.warehouseId));
  }

  const [products, employees, warehouses, activeWarehouses, vehicle, allVehicles] =
    await Promise.all([
      Product.find({ _id: { $in: [...productIds] } })
        .select({ sku: 1, names: 1, isConsumable: 1 })
        .lean()
        .exec(),
      employeeIds.length
        ? Employee.find({ _id: { $in: employeeIds } })
            .select({ name: 1, email: 1 })
            .lean()
            .exec()
        : [],
      warehouseIds.size
        ? Warehouse.find({ _id: { $in: [...warehouseIds] } })
            .select({ name: 1, key: 1 })
            .lean()
            .exec()
        : [],
      Warehouse.find({ isActive: true })
        .select({ name: 1, key: 1 })
        .sort({ name: 1 })
        .lean()
        .exec(),
      jobDoc.vehicleId
        ? Vehicle.findById(jobDoc.vehicleId).select({ name: 1, plateNumber: 1 }).lean().exec()
        : null,
      canWrite
        ? Vehicle.find({ isActive: true })
            .select({ name: 1, plateNumber: 1 })
            .sort({ name: 1 })
            .lean()
            .exec()
        : [],
    ]);

  const productMap = new Map(products.map((p) => [String(p._id), p]));
  const employeeMap = new Map(employees.map((e) => [String(e._id), e]));
  const warehouseMap = new Map([...warehouses, ...activeWarehouses].map((w) => [String(w._id), w]));
  const productLabel = (id: mongoose.Types.ObjectId | string) => {
    const p = productMap.get(String(id));
    return p?.names?.hu ?? p?.names?.en ?? p?.sku ?? '—';
  };
  const employeeLabel = (id?: mongoose.Types.ObjectId | string) => {
    if (!id) return null;
    const e = employeeMap.get(String(id));
    return e ? { id: String(id), label: e.email ? `${e.name} · ${e.email}` : e.name } : null;
  };

  const status = jobDoc.status;

  // --- Read-only parts list ---
  let partsList: PickupLineListItem[] = [];
  if (status === 'draft' && jobDoc.demandLines?.length) {
    const availability = await previewDemandAvailability(jobDoc.demandLines);
    partsList = availability.map((row, idx) => ({
      productId: row.productId ?? `kit-${idx}`,
      sku: row.sku,
      name: row.name,
      quantity: row.requested,
      isPrebuild: row.isKit,
      isOptional: jobDoc.demandLines[idx]?.isOptional,
      bomComponents: row.components.map((c) => ({
        productId: c.productId,
        sku: c.sku,
        name: c.name,
        quantityPerKit: c.quantityPerKit,
        totalQuantity: c.required,
        depth: 0,
        isAssembly: false,
      })),
    }));
  } else if (jobDoc.lines?.length) {
    const enriched = await enrichJobLinesDisplay(
      jobDoc.lines.map((l) => ({ productId: l.productId, quantity: l.requestedQuantity }))
    );
    const enrichedMap = new Map(enriched.map((e) => [e.productId, e]));
    partsList = jobDoc.lines.map((l) => {
      const e = enrichedMap.get(String(l.productId));
      return {
        productId: String(l.productId),
        sku: e?.sku ?? productMap.get(String(l.productId))?.sku ?? '—',
        name: e?.name ?? productLabel(l.productId),
        quantity: l.requestedQuantity,
        isPrebuild: e?.isPrebuild ?? false,
        isOptional: l.isOptional,
        bomComponents: e?.bomComponents ?? [],
      };
    });
  }

  const pickupEmployee = employeeLabel(jobDoc.pickupEmployeeId);
  const dropoffEmployee = employeeLabel(jobDoc.dropoffEmployeeId);
  const crewEmployees = (jobDoc.crewEmployeeIds ?? [])
    .map((id) => employeeLabel(id))
    .filter((e): e is { id: string; label: string } => Boolean(e));

  const feedback = (jobDoc.feedback ?? [])
    .slice()
    .reverse()
    .map((f) => ({
      id: String(f._id),
      employeeName: employeeMap.get(String(f.employeeId))?.name ?? '—',
      message: f.message,
      createdAt: formatDateTime(f.createdAt, 'hu-HU'),
    }));

  const initialDemand: DemandLineDraft[] = (jobDoc.demandLines ?? []).map((l, idx) => ({
    localId: `existing-${idx}`,
    productId: l.productId ? String(l.productId) : undefined,
    sku: l.productId ? (productMap.get(String(l.productId))?.sku ?? '—') : 'egyedi',
    name: l.kit?.name || productLabel(l.productId ?? '') || 'Egyedi összeállítás',
    quantity: l.requestedQuantity,
    isOptional: Boolean(l.isOptional),
    warehouseId: l.warehouseId ? String(l.warehouseId) : undefined,
    kit: l.kit?.components?.length
      ? {
          name: l.kit.name,
          substitutionNote: l.kit.substitutionNote,
          components: l.kit.components.map((c) => ({
            productId: String(c.productId),
            sku: productMap.get(String(c.productId))?.sku ?? '—',
            name: productLabel(c.productId),
            quantity: c.quantity,
            note: c.note,
          })),
        }
      : undefined,
  }));

  const canEditJob = canWrite && status !== 'completed' && status !== 'cancelled';

  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{jobDoc.reference}</h1>
          <p className="text-muted-foreground text-sm">
            {jobDoc.eventName} · {jobDoc.siteAddress}
          </p>
          <p className="text-sm">
            Állapot: <Badge variant="outline">{JOB_STATUS_LABELS[status] ?? status}</Badge>
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/logistics/jobs">Vissza a listához</Link>
        </Button>
      </div>

      {jobDoc.note && (
        <Card>
          <CardContent className="text-muted-foreground pt-4 text-sm">{jobDoc.note}</CardContent>
        </Card>
      )}

      <JobActionsBar jobId={id} status={status} canEdit={canWrite} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Csapat</CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeesPanel
            jobId={id}
            canEdit={canEditJob}
            pickupEmployee={pickupEmployee}
            dropoffEmployee={dropoffEmployee}
            crewEmployees={crewEmployees}
            vehicles={allVehicles.map((v) => ({
              id: String(v._id),
              name: v.name,
              plateNumber: v.plateNumber,
            }))}
            vehicleId={jobDoc.vehicleId ? String(jobDoc.vehicleId) : undefined}
          />
          {vehicle && (
            <p className="text-muted-foreground mt-2 text-sm">
              Jármű: {vehicle.name} ({vehicle.plateNumber})
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tételek</CardTitle>
        </CardHeader>
        <CardContent>
          {status === 'draft' && canWrite ? (
            <DemandEditPanel
              jobId={id}
              initialDemand={initialDemand}
              warehouses={activeWarehouses.map((w) => ({
                id: String(w._id),
                name: w.name,
                key: w.key,
              }))}
            />
          ) : (
            <PickupLinesList lines={partsList} />
          )}
        </CardContent>
      </Card>

      {status === 'scheduled' && (canWrite || roles.includes('pickup')) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Átvétel rögzítése</CardTitle>
          </CardHeader>
          <CardContent>
            <PickupCheckInForm
              jobId={id}
              lines={(jobDoc.lines ?? []).map((l) => {
                const e = partsList.find((p) => p.productId === String(l.productId));
                return {
                  productId: String(l.productId),
                  sku: e?.sku ?? '—',
                  name: e?.name ?? productLabel(l.productId),
                  isPrebuild: e?.isPrebuild ?? false,
                  bomComponents: e?.bomComponents ?? [],
                  requestedQuantity: l.requestedQuantity,
                  warehouseName: l.warehouseId
                    ? warehouseMap.get(String(l.warehouseId))?.name
                    : undefined,
                };
              })}
            />
          </CardContent>
        </Card>
      )}

      {status === 'picked_up' &&
        (canWrite || roles.includes('dropoff') || roles.includes('pickup')) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leadás / visszaellenőrzés</CardTitle>
            </CardHeader>
            <CardContent>
              <ReturnCheckInForm
                jobId={id}
                lines={(jobDoc.lines ?? []).map((l) => {
                  const e = partsList.find((p) => p.productId === String(l.productId));
                  return {
                    productId: String(l.productId),
                    sku: e?.sku ?? '—',
                    name: e?.name ?? productLabel(l.productId),
                    isConsumable: Boolean(productMap.get(String(l.productId))?.isConsumable),
                    isPrebuild: e?.isPrebuild ?? false,
                    bomComponents: e?.bomComponents ?? [],
                    gatheredQuantity: l.gatheredQuantity,
                    warehouseId: l.warehouseId ? String(l.warehouseId) : undefined,
                  };
                })}
                warehouses={activeWarehouses.map((w) => ({ id: String(w._id), name: w.name }))}
              />
            </CardContent>
          </Card>
        )}

      {status === 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lezárva</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <ul className="space-y-1">
              {(jobDoc.lines ?? []).map((l) => (
                <li key={String(l.productId)} className="flex justify-between gap-2">
                  <span>{productLabel(l.productId)}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {l.gatheredQuantity} kivitt · {l.checkedQuantity} visszaérkezett
                    {l.lostQuantity > 0 ? (
                      <span className="text-destructive ml-2">hiány {l.lostQuantity}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visszajelzések</CardTitle>
        </CardHeader>
        <CardContent>
          <FeedbackPanel jobId={id} feedback={feedback} />
        </CardContent>
      </Card>
    </Container>
  );
}
