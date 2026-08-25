'use server';

import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import { getCurrentUser, requireAuth, requirePermission } from '@crm/auth';
import { connectDB, LogisticsJob, Vehicle, Warehouse, type IDemandLine } from '@crm/db-core';
import {
  assignJobEmployees,
  cancelLogisticsJob,
  confirmPickupCheckIn,
  confirmReturnCheckIn,
  createLogisticsJob,
  enrichJobLinesDisplay,
  jobRolesForEmployees,
  loadCatalogBom,
  previewDemandAvailability,
  scheduleLogisticsJob,
  submitJobFeedback,
  updateJobDemand,
} from '@crm/logistics';
import {
  assignEmployeesSchema,
  createJobSchema,
  jobFeedbackSchema,
  parseCrewEmployeeIdsJson,
  parseDemandJson,
  parsePickupCheckInLinesJson,
  parseReturnCheckInLinesJson,
  pickupCheckInSchema,
  returnCheckInSchema,
} from '@crm/lib/validation';
import { parseHrDateTime } from '@crm/lib';
import { listMembershipsForUser } from '@crm/hr';
import type { JobFormState } from './job-form-state';

export type { JobFormState } from './job-form-state';

function zodToFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || 'form';
    fieldErrors[key] = fieldErrors[key] ?? [];
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}

function parseOptionalDateTime(value?: string): Date | undefined {
  if (!value?.trim()) return undefined;
  return parseHrDateTime(value.trim());
}

async function actorId(): Promise<string> {
  const user = await requirePermission('logistics:write');
  if (!user?.id) throw new Error('Unauthorized');
  return user.id;
}

function mapDemandLines(demand: ReturnType<typeof parseDemandJson>): IDemandLine[] {
  return demand.map((l) => ({
    productId: l.productId ? new mongoose.Types.ObjectId(l.productId) : undefined,
    requestedQuantity: l.requestedQuantity,
    isOptional: l.isOptional,
    note: l.note,
    warehouseId: l.warehouseId ? new mongoose.Types.ObjectId(l.warehouseId) : undefined,
    kit: l.kit
      ? {
          name: l.kit.name,
          substitutionNote: l.kit.substitutionNote,
          components: l.kit.components.map((c) => ({
            productId: new mongoose.Types.ObjectId(c.productId),
            quantity: c.quantity,
            note: c.note,
          })),
        }
      : undefined,
  }));
}

function revalidateJob(jobId: string) {
  revalidatePath(`/logistics/jobs/${jobId}`);
  revalidatePath('/logistics/jobs');
  revalidatePath('/logistics');
  revalidatePath('/hr/me');
  revalidatePath('/hr/calendar');
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
    eventAt: formData.get('eventAt') || undefined,
    pickupAt: formData.get('pickupAt') || undefined,
    returnAt: formData.get('returnAt') || undefined,
    demandJson: formData.get('demandJson'),
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  let demand;
  try {
    demand = parseDemandJson(parsed.data.demandJson);
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Érvénytelen lista.' };
  }

  try {
    const job = await createLogisticsJob({
      eventName: parsed.data.eventName,
      siteAddress: parsed.data.siteAddress,
      note: parsed.data.note,
      eventAt: parseOptionalDateTime(parsed.data.eventAt),
      pickupAt: parseOptionalDateTime(parsed.data.pickupAt),
      returnAt: parseOptionalDateTime(parsed.data.returnAt),
      demandLines: mapDemandLines(demand),
      createdBy: new mongoose.Types.ObjectId(userId),
    });
    revalidateJob(String(job._id));
    return {
      success: true,
      message: `Esemény ${job.reference} létrehozva.`,
      id: String(job._id),
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Létrehozás sikertelen.',
    };
  }
}

export async function updateJobDemandAction(
  jobId: string,
  _prev: JobFormState,
  formData: FormData
): Promise<JobFormState> {
  const userId = await actorId();
  const demandJson = formData.get('demandJson');
  if (typeof demandJson !== 'string') {
    return { success: false, message: 'Érvénytelen lista.' };
  }

  let demand;
  try {
    demand = parseDemandJson(demandJson);
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Érvénytelen lista.' };
  }

  try {
    await updateJobDemand(
      new mongoose.Types.ObjectId(jobId),
      mapDemandLines(demand),
      new mongoose.Types.ObjectId(userId)
    );
    revalidateJob(jobId);
    return { success: true, message: 'Igénylista frissítve.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Mentés sikertelen.' };
  }
}

export async function assignEmployeesAction(
  jobId: string,
  _prev: JobFormState,
  formData: FormData
): Promise<JobFormState> {
  await actorId();
  const parsed = assignEmployeesSchema.safeParse({
    pickupEmployeeId: formData.get('pickupEmployeeId'),
    dropoffEmployeeId: formData.get('dropoffEmployeeId') || undefined,
    crewEmployeeIdsJson: formData.get('crewEmployeeIdsJson') || undefined,
    vehicleId: formData.get('vehicleId') || undefined,
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  let crewEmployeeIds: string[];
  try {
    crewEmployeeIds = parseCrewEmployeeIdsJson(parsed.data.crewEmployeeIdsJson);
  } catch {
    return { success: false, message: 'Érvénytelen csapatlista.' };
  }

  try {
    await assignJobEmployees(new mongoose.Types.ObjectId(jobId), {
      pickupEmployeeId: new mongoose.Types.ObjectId(parsed.data.pickupEmployeeId),
      dropoffEmployeeId: parsed.data.dropoffEmployeeId
        ? new mongoose.Types.ObjectId(parsed.data.dropoffEmployeeId)
        : undefined,
      crewEmployeeIds: crewEmployeeIds.map((id) => new mongoose.Types.ObjectId(id)),
      vehicleId: parsed.data.vehicleId
        ? new mongoose.Types.ObjectId(parsed.data.vehicleId)
        : undefined,
    });
    revalidateJob(jobId);
    return { success: true, message: 'Csapat mentve.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Mentés sikertelen.' };
  }
}

export async function scheduleJobAction(jobId: string): Promise<JobFormState> {
  const userId = await actorId();
  try {
    await scheduleLogisticsJob(
      new mongoose.Types.ObjectId(jobId),
      new mongoose.Types.ObjectId(userId)
    );
    revalidateJob(jobId);
    return { success: true, message: 'Esemény ütemezve, értesítő e-mail elküldve.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Ütemezés sikertelen.' };
  }
}

export async function cancelJobAction(id: string): Promise<JobFormState> {
  const userId = await actorId();
  try {
    await cancelLogisticsJob(new mongoose.Types.ObjectId(id), new mongoose.Types.ObjectId(userId));
    revalidateJob(id);
    return { success: true, message: 'Esemény törölve.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Törlés sikertelen.' };
  }
}

/** Resolve the current user's role(s) on a job: logistics:write bypasses, otherwise by employee membership. */
export async function requireJobActor(jobId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  await connectDB();
  const job = await LogisticsJob.findById(jobId).exec();
  if (!job) throw new Error('Az esemény nem található.');
  const memberships = await listMembershipsForUser(user.id);
  const employeeIds = memberships.map((m) => m._id);
  const roles = jobRolesForEmployees(job, employeeIds);
  const canWrite = user.permissions.includes('logistics:write');
  if (!canWrite && !roles.length) throw new Error('Nincs jogosultság ehhez az eseményhez.');
  return { user, job, employeeIds, roles, canWrite };
}

export async function pickupCheckInAction(
  jobId: string,
  _prev: JobFormState,
  formData: FormData
): Promise<JobFormState> {
  let actor;
  try {
    actor = await requireJobActor(jobId);
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Nincs jogosultság.' };
  }
  if (!actor.canWrite && !actor.roles.includes('pickup')) {
    return { success: false, message: 'Csak az átvételért felelős rögzítheti az összeszedést.' };
  }

  const parsed = pickupCheckInSchema.safeParse({
    linesJson: formData.get('linesJson'),
    note: formData.get('note') || undefined,
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  let lines;
  try {
    lines = parsePickupCheckInLinesJson(parsed.data.linesJson);
  } catch {
    return { success: false, message: 'Érvénytelen tételek.' };
  }

  try {
    await confirmPickupCheckIn(
      new mongoose.Types.ObjectId(jobId),
      lines.map((l) => ({
        productId: new mongoose.Types.ObjectId(l.productId),
        gatheredQuantity: l.gatheredQuantity,
        warehouseId: l.warehouseId ? new mongoose.Types.ObjectId(l.warehouseId) : undefined,
      })),
      parsed.data.note,
      new mongoose.Types.ObjectId(actor.user.id)
    );
    revalidateJob(jobId);
    revalidatePath('/inventory');
    return { success: true, message: 'Átvétel rögzítve, készlet csökkentve.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Rögzítés sikertelen.' };
  }
}

export async function returnCheckInAction(
  jobId: string,
  _prev: JobFormState,
  formData: FormData
): Promise<JobFormState> {
  let actor;
  try {
    actor = await requireJobActor(jobId);
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Nincs jogosultság.' };
  }
  if (!actor.canWrite && !actor.roles.includes('dropoff') && !actor.roles.includes('pickup')) {
    return { success: false, message: 'Csak a leadásért felelős rögzítheti a visszaellenőrzést.' };
  }

  const parsed = returnCheckInSchema.safeParse({
    linesJson: formData.get('linesJson'),
    note: formData.get('note') || undefined,
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  let lines;
  try {
    lines = parseReturnCheckInLinesJson(parsed.data.linesJson);
  } catch {
    return { success: false, message: 'Érvénytelen tételek.' };
  }

  try {
    await confirmReturnCheckIn(
      new mongoose.Types.ObjectId(jobId),
      lines.map((l) => ({
        productId: new mongoose.Types.ObjectId(l.productId),
        checkedQuantity: l.checkedQuantity,
        returnWarehouseId: l.returnWarehouseId
          ? new mongoose.Types.ObjectId(l.returnWarehouseId)
          : undefined,
      })),
      parsed.data.note,
      new mongoose.Types.ObjectId(actor.user.id)
    );
    revalidateJob(jobId);
    revalidatePath('/inventory');
    return { success: true, message: 'Leadás rögzítve, készlet frissítve.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Rögzítés sikertelen.' };
  }
}

export async function submitFeedbackAction(
  jobId: string,
  _prev: JobFormState,
  formData: FormData
): Promise<JobFormState> {
  let actor;
  try {
    actor = await requireJobActor(jobId);
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Nincs jogosultság.' };
  }

  const parsed = jobFeedbackSchema.safeParse({ message: formData.get('message') });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  const employeeId = actor.employeeIds[0];
  if (!employeeId) {
    return { success: false, message: 'Nincs dolgozói profil ehhez a fiókhoz.' };
  }

  try {
    await submitJobFeedback(new mongoose.Types.ObjectId(jobId), employeeId, parsed.data.message);
    revalidateJob(jobId);
    return { success: true, message: 'Visszajelzés mentve.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Mentés sikertelen.' };
  }
}

export async function previewDemandAvailabilityAction(demandJson: string) {
  await requirePermission('logistics:write');
  try {
    const parsed = JSON.parse(demandJson || '[]') as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return [];
    const demand = parseDemandJson(JSON.stringify(parsed));
    return previewDemandAvailability(mapDemandLines(demand));
  } catch {
    return [];
  }
}

export async function loadCatalogBomAction(productId: string) {
  await requirePermission('logistics:write');
  try {
    return await loadCatalogBom(new mongoose.Types.ObjectId(productId));
  } catch {
    return null;
  }
}

export async function enrichJobLinesDisplayAction(
  lines: Array<{ productId: string; quantity: number }>
) {
  await requireAuth();
  try {
    const enriched = await enrichJobLinesDisplay(
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

export async function loadJobFormOptionsAction() {
  await requirePermission('logistics:write');
  await connectDB();

  const [warehouses, vehicles] = await Promise.all([
    Warehouse.find({ isActive: true }).sort({ name: 1 }).lean().exec(),
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
