'use server';

import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import { getCurrentUser, requireAnyPermission, requirePermission } from '@crm/auth';
import { LOGISTICS_READ_PERMISSION_KEYS } from '@crm/lib';
import { connectDB, Vehicle, Warehouse } from '@crm/db';
import {
  buildLogisticsPickupDocument,
  canAccessPickupWarehouse,
  enrichPickupLinesDisplay,
  getWarehouseIdsForUser,
  hasGlobalLogisticsScope,
  cancelLogisticsJob,
  confirmPickupCheckIn,
  confirmPickupDelivery,
  confirmPickupGathering,
  confirmPickupPickup,
  confirmPickupReturnDeparture,
  createLogisticsJob,
  scheduleLogisticsJob,
  suggestVehiclesForCargo,
  updatePickupInstallation,
} from '@crm/core';
import {
  checkInJobLinesSchema,
  createJobSchema,
  gatherJobLinesSchema,
  installJobLinesSchema,
  parseCheckInLinesJson,
  parseGatherLinesJson,
  parseInstallLinesJson,
  parseJobLinesJson,
  parsePickupsJson,
  parseReturnLinesJson,
  returnJobLinesSchema,
  suggestVehiclesSchema,
} from '@crm/lib/validation';
import { parseHrDateTime } from '@crm/lib';

export type JobFormState =
  | { success: false; fieldErrors?: Record<string, string[]>; message?: string }
  | { success: true; message?: string; id?: string };

function zodToFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || 'form';
    fieldErrors[key] = fieldErrors[key] ?? [];
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}

async function actorId(): Promise<string> {
  const user = await requirePermission('logistics:write');
  if (!user?.id) throw new Error('Unauthorized');
  return user.id;
}

async function assertWarehouseAccess(warehouseId: string): Promise<void> {
  await requirePermission('logistics:write');
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  if (hasGlobalLogisticsScope(user.permissions)) return;
  const allowed = await canAccessPickupWarehouse(
    new mongoose.Types.ObjectId(user.id),
    user.permissions,
    new mongoose.Types.ObjectId(warehouseId)
  );
  if (!allowed) throw new Error('Nincs jogosultság ehhez a raktárhoz.');
}

function parseOptionalDateTime(value?: string): Date | undefined {
  if (!value?.trim()) return undefined;
  return parseHrDateTime(value.trim());
}

export async function createJobAction(
  _prev: JobFormState,
  formData: FormData
): Promise<JobFormState> {
  const userId = await actorId();

  const parsed = createJobSchema.safeParse({
    eventName: formData.get('eventName'),
    siteAddress: formData.get('siteAddress'),
    note: formData.get('note') || undefined,
    plannedEventAt: formData.get('plannedEventAt') || undefined,
    pickupsJson: formData.get('pickupsJson'),
    publish: formData.get('publish'),
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  let pickups;
  try {
    pickups = parsePickupsJson(parsed.data.pickupsJson);
  } catch {
    return { success: false, message: 'Érvénytelen átvételi körök.' };
  }

  try {
    for (const p of pickups) {
      await assertWarehouseAccess(p.warehouseId);
    }
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Raktár hozzáférés megtagadva.',
    };
  }

  try {
    const job = await createLogisticsJob({
      eventName: parsed.data.eventName,
      siteAddress: parsed.data.siteAddress,
      note: parsed.data.note,
      plannedEventAt: parseOptionalDateTime(parsed.data.plannedEventAt),
      pickups: pickups.map((p) => ({
        label: p.label,
        warehouseId: new mongoose.Types.ObjectId(p.warehouseId),
        vehicleId: p.vehicleId ? new mongoose.Types.ObjectId(p.vehicleId) : undefined,
        teamMemberIds: p.teamMemberIds.map((id) => new mongoose.Types.ObjectId(id)),
        contactEmails: p.contactEmails,
        note: p.note,
        plannedGatherAt: parseOptionalDateTime(p.plannedGatherAt),
        plannedEventAt: parseOptionalDateTime(p.plannedEventAt),
        lines: p.lines.map((l) => ({
          productId: new mongoose.Types.ObjectId(l.productId),
          requestedQuantity: l.requestedQuantity,
        })),
      })),
      createdBy: new mongoose.Types.ObjectId(userId),
      publish: parsed.data.publish,
    });

    revalidatePath('/logistics/jobs');
    revalidatePath('/logistics');
    return {
      success: true,
      message: `Esemény ${job.reference} létrehozva (${pickups.length} átvétel).`,
      id: job._id.toString(),
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Létrehozás sikertelen.',
    };
  }
}

export async function scheduleJobAction(jobId: string): Promise<JobFormState> {
  await actorId();
  try {
    await scheduleLogisticsJob(new mongoose.Types.ObjectId(jobId));
    revalidatePath(`/logistics/jobs/${jobId}`);
    revalidatePath('/logistics/jobs');
    return { success: true, message: 'Összes átvétel ütemezve.' };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Ütemezés sikertelen.',
    };
  }
}

export async function gatherPickupAction(
  jobId: string,
  _prev: JobFormState,
  formData: FormData
): Promise<JobFormState> {
  const userId = await actorId();
  const parsed = gatherJobLinesSchema.safeParse({
    pickupId: formData.get('pickupId'),
    linesJson: formData.get('linesJson'),
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  let lines;
  try {
    lines = parseGatherLinesJson(parsed.data.linesJson);
  } catch {
    return { success: false, message: 'Érvénytelen összeszedési adatok.' };
  }

  try {
    await confirmPickupGathering(
      new mongoose.Types.ObjectId(jobId),
      new mongoose.Types.ObjectId(parsed.data.pickupId),
      lines.map((l) => ({
        productId: new mongoose.Types.ObjectId(l.productId),
        gatheredQuantity: l.gatheredQuantity,
      })),
      new mongoose.Types.ObjectId(userId)
    );
    revalidatePath(`/logistics/jobs/${jobId}`);
    revalidatePath('/logistics');
    revalidatePath('/inventory');
    return { success: true, message: 'Összeszedés rögzítve, készlet csökkentve.' };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Összeszedés sikertelen.',
    };
  }
}

export async function pickupPickupAction(jobId: string, pickupId: string): Promise<JobFormState> {
  await actorId();
  try {
    await confirmPickupPickup(
      new mongoose.Types.ObjectId(jobId),
      new mongoose.Types.ObjectId(pickupId)
    );
    revalidatePath(`/logistics/jobs/${jobId}`);
    return { success: true, message: 'Átvétel rögzítve.' };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Művelet sikertelen.',
    };
  }
}

export async function deliverPickupAction(jobId: string, pickupId: string): Promise<JobFormState> {
  await actorId();
  try {
    await confirmPickupDelivery(
      new mongoose.Types.ObjectId(jobId),
      new mongoose.Types.ObjectId(pickupId)
    );
    revalidatePath(`/logistics/jobs/${jobId}`);
    return { success: true, message: 'Kiszállítás rögzítve.' };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Művelet sikertelen.',
    };
  }
}

export async function installPickupAction(
  jobId: string,
  _prev: JobFormState,
  formData: FormData
): Promise<JobFormState> {
  await actorId();
  const parsed = installJobLinesSchema.safeParse({
    pickupId: formData.get('pickupId'),
    linesJson: formData.get('linesJson'),
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  let lines;
  try {
    lines = parseInstallLinesJson(parsed.data.linesJson);
  } catch {
    return { success: false, message: 'Érvénytelen telepítési adatok.' };
  }

  try {
    await updatePickupInstallation(
      new mongoose.Types.ObjectId(jobId),
      new mongoose.Types.ObjectId(parsed.data.pickupId),
      lines.map((l) => ({
        productId: new mongoose.Types.ObjectId(l.productId),
        installedQuantity: l.installedQuantity,
        installedLocation: l.installedLocation,
      }))
    );
    revalidatePath(`/logistics/jobs/${jobId}`);
    return { success: true, message: 'Telepítés mentve.' };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Mentés sikertelen.',
    };
  }
}

export async function returnPickupAction(
  jobId: string,
  _prev: JobFormState,
  formData: FormData
): Promise<JobFormState> {
  await actorId();
  const parsed = returnJobLinesSchema.safeParse({
    pickupId: formData.get('pickupId'),
    linesJson: formData.get('linesJson'),
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  let lines;
  try {
    lines = parseReturnLinesJson(parsed.data.linesJson);
  } catch {
    return { success: false, message: 'Érvénytelen visszaszállítási adatok.' };
  }

  try {
    await confirmPickupReturnDeparture(
      new mongoose.Types.ObjectId(jobId),
      new mongoose.Types.ObjectId(parsed.data.pickupId),
      lines.map((l) => ({
        productId: new mongoose.Types.ObjectId(l.productId),
        returnedQuantity: l.returnedQuantity,
      }))
    );
    revalidatePath(`/logistics/jobs/${jobId}`);
    return { success: true, message: 'Visszaszállítás indul.' };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Művelet sikertelen.',
    };
  }
}

export async function checkInPickupAction(
  jobId: string,
  _prev: JobFormState,
  formData: FormData
): Promise<JobFormState> {
  const userId = await actorId();
  const parsed = checkInJobLinesSchema.safeParse({
    pickupId: formData.get('pickupId'),
    linesJson: formData.get('linesJson'),
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  let lines;
  try {
    lines = parseCheckInLinesJson(parsed.data.linesJson);
  } catch {
    return { success: false, message: 'Érvénytelen bevételezési adatok.' };
  }

  try {
    await confirmPickupCheckIn(
      new mongoose.Types.ObjectId(jobId),
      new mongoose.Types.ObjectId(parsed.data.pickupId),
      lines.map((l) => ({
        productId: new mongoose.Types.ObjectId(l.productId),
        checkedQuantity: l.checkedQuantity,
      })),
      new mongoose.Types.ObjectId(userId)
    );
    revalidatePath(`/logistics/jobs/${jobId}`);
    revalidatePath('/logistics');
    revalidatePath('/inventory');
    return { success: true, message: 'Visszáru ellenőrizve, készlet frissítve.' };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Bevételezés sikertelen.',
    };
  }
}

export async function cancelJobAction(id: string): Promise<JobFormState> {
  await actorId();
  try {
    await cancelLogisticsJob(new mongoose.Types.ObjectId(id));
    revalidatePath(`/logistics/jobs/${id}`);
    revalidatePath('/logistics/jobs');
    return { success: true, message: 'Esemény törölve.' };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Törlés sikertelen.',
    };
  }
}

/** Returns JSON document payload for future PDF rendering / email attachment. */
export async function getPickupDocumentPayloadAction(
  jobId: string,
  pickupId: string,
  documentType: 'packing_list' | 'pickup_slip' | 'return_slip'
) {
  await requireAnyPermission([...LOGISTICS_READ_PERMISSION_KEYS]);
  try {
    const payload = await buildLogisticsPickupDocument(
      new mongoose.Types.ObjectId(jobId),
      new mongoose.Types.ObjectId(pickupId),
      documentType
    );
    return { success: true as const, payload };
  } catch (err) {
    return {
      success: false as const,
      message: err instanceof Error ? err.message : 'Dokumentum előkészítés sikertelen.',
    };
  }
}

export async function enrichPickupLinesDisplayAction(
  lines: Array<{ productId: string; quantity: number }>
) {
  await requireAnyPermission([...LOGISTICS_READ_PERMISSION_KEYS]);
  try {
    const enriched = await enrichPickupLinesDisplay(
      lines.map((l) => ({
        productId: new mongoose.Types.ObjectId(l.productId),
        quantity: l.quantity,
      }))
    );
    return { success: true as const, lines: enriched };
  } catch (err) {
    return {
      success: false as const,
      message: err instanceof Error ? err.message : 'Tétellista bővítése sikertelen.',
    };
  }
}

export async function suggestVehiclesAction(linesJson: string) {
  await requireAnyPermission([...LOGISTICS_READ_PERMISSION_KEYS]);

  const parsed = suggestVehiclesSchema.safeParse({ linesJson });
  if (!parsed.success) {
    return { success: false as const, message: 'Érvénytelen tételek.' };
  }

  try {
    const lines = parseJobLinesJson(parsed.data.linesJson);
    const result = await suggestVehiclesForCargo(
      lines.map((l) => ({
        productId: new mongoose.Types.ObjectId(l.productId),
        quantity: l.requestedQuantity,
      }))
    );
    return {
      success: true as const,
      totals: result.totals,
      suggestions: result.suggestions.map((s) => ({
        vehicleId: s.vehicle._id.toString(),
        name: s.vehicle.name,
        plateNumber: s.vehicle.plateNumber,
        fits: s.fits,
        reasons: s.reasons,
      })),
    };
  } catch (err) {
    return {
      success: false as const,
      message: err instanceof Error ? err.message : 'Jármű javaslat sikertelen.',
    };
  }
}

export async function loadJobFormOptionsAction() {
  await requireAnyPermission([...LOGISTICS_READ_PERMISSION_KEYS]);
  await connectDB();

  const user = await getCurrentUser();
  let warehouseQuery: Record<string, unknown> = { isActive: true };
  if (user && !hasGlobalLogisticsScope(user.permissions)) {
    const warehouseIds = await getWarehouseIdsForUser(new mongoose.Types.ObjectId(user.id));
    warehouseQuery = { ...warehouseQuery, _id: { $in: warehouseIds } };
  }

  const [warehouses, vehicles] = await Promise.all([
    Warehouse.find(warehouseQuery).sort({ name: 1 }).lean().exec(),
    Vehicle.find({ isActive: true }).sort({ name: 1 }).lean().exec(),
  ]);

  return {
    warehouses: warehouses.map((w) => ({ id: String(w._id), name: w.name, key: w.key })),
    vehicles: vehicles.map((v) => ({
      id: String(v._id),
      name: v.name,
      plateNumber: v.plateNumber,
    })),
  };
}
