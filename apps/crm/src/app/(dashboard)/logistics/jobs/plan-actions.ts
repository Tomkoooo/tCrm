'use server';

import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import { getCurrentUser, requirePermission } from '@crm/auth';
import {
  assertCanPerformCrewRole,
  createDemandJob,
  lockJobPlan,
  proposeJobPlan,
  previewPickupPlan,
  previewDemandAvailability,
  loadCatalogBom,
  requestJobItems,
  resolveFieldActor,
  resolveJobItemRequest,
  submitJobFeedback,
  updatePickupVehicle,
  loadJobOrThrow,
  type FieldActor,
  type DemandLineInput,
  type PreviewPickupPlanResult,
} from '@crm/logistics';
import type { CrewRole, ILogisticsJob } from '@crm/db-core';
import {
  createDemandJobSchema,
  itemRequestSchema,
  jobFeedbackSchema,
  parseCrewJson,
  parseDemandJson,
  parseDraftPickupRoundsJson,
} from '@crm/lib/validation';
import { parseHrDateTime } from '@crm/lib';
import type { JobFormState } from './job-form-state';

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

function revalidateJob(jobId: string) {
  revalidatePath(`/logistics/jobs/${jobId}`);
  revalidatePath('/logistics/jobs');
  revalidatePath('/logistics');
  revalidatePath('/hr/me');
  revalidatePath('/hr/calendar');
  revalidatePath(`/hr/me/jobs/${jobId}`);
}

function mapDemandLines(demand: ReturnType<typeof parseDemandJson>): DemandLineInput[] {
  return demand.map((l) => ({
    productId: l.productId ? new mongoose.Types.ObjectId(l.productId) : undefined,
    requestedQuantity: l.requestedQuantity,
    isOptional: l.isOptional,
    note: l.note,
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

export async function createDemandJobAction(
  _prev: JobFormState,
  formData: FormData
): Promise<JobFormState> {
  const user = await requirePermission('logistics:write');
  if (!user?.id) throw new Error('Unauthorized');

  const parsed = createDemandJobSchema.safeParse({
    eventName: formData.get('eventName'),
    siteAddress: formData.get('siteAddress'),
    note: formData.get('note') || undefined,
    plannedEventAt: formData.get('plannedEventAt') || undefined,
    plannedGatherAt: formData.get('plannedGatherAt') || undefined,
    plannedReturnAt: formData.get('plannedReturnAt') || undefined,
    demandJson: formData.get('demandJson'),
    crewJson: formData.get('crewJson'),
    pickupsJson: formData.get('pickupsJson') || undefined,
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  let demand;
  let crew;
  let pickups;
  try {
    demand = parseDemandJson(parsed.data.demandJson);
    crew = parseCrewJson(parsed.data.crewJson);
    pickups = parsed.data.pickupsJson ? parseDraftPickupRoundsJson(parsed.data.pickupsJson) : [];
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Érvénytelen lista vagy csapat.',
    };
  }

  try {
    const job = await createDemandJob({
      eventName: parsed.data.eventName,
      siteAddress: parsed.data.siteAddress,
      note: parsed.data.note,
      plannedEventAt: parseOptionalDateTime(parsed.data.plannedEventAt),
      plannedGatherAt: parseOptionalDateTime(parsed.data.plannedGatherAt),
      plannedReturnAt: parseOptionalDateTime(parsed.data.plannedReturnAt),
      demandLines: mapDemandLines(demand),
      crew: crew.map((m) => ({
        employeeId: new mongoose.Types.ObjectId(m.employeeId),
        roles: m.roles,
      })),
      pickups: pickups.map((r) => ({
        warehouseId: new mongoose.Types.ObjectId(r.warehouseId),
        vehicleId: r.vehicleId ? new mongoose.Types.ObjectId(r.vehicleId) : undefined,
        vehicleWarning: r.vehicleWarning,
        lines: r.lines.map((l) => ({
          productId: new mongoose.Types.ObjectId(l.productId),
          requestedQuantity: l.requestedQuantity,
          isOptional: l.isOptional,
        })),
      })),
      createdBy: new mongoose.Types.ObjectId(user.id),
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

export async function proposeJobPlanAction(jobId: string): Promise<JobFormState> {
  await requirePermission('logistics:write');
  const user = await getCurrentUser();
  if (!user?.id) throw new Error('Unauthorized');
  try {
    await proposeJobPlan(new mongoose.Types.ObjectId(jobId), new mongoose.Types.ObjectId(user.id));
    revalidateJob(jobId);
    return {
      success: true,
      message: 'Átvételi körök javasolva. Ellenőrizd a járműveket, majd zárold a tervet.',
    };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Javaslat sikertelen.' };
  }
}

export async function lockJobPlanAction(jobId: string): Promise<JobFormState> {
  await requirePermission('logistics:write');
  const user = await getCurrentUser();
  if (!user?.id) throw new Error('Unauthorized');
  try {
    await lockJobPlan(new mongoose.Types.ObjectId(jobId), new mongoose.Types.ObjectId(user.id));
    revalidateJob(jobId);
    revalidatePath('/inventory');
    return { success: true, message: 'Terv zárolva: készlet és jármű foglalva, naptár frissítve.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Zárolás sikertelen.' };
  }
}

export async function updatePickupVehicleAction(
  jobId: string,
  pickupId: string,
  vehicleId: string
): Promise<JobFormState> {
  await requirePermission('logistics:write');
  const user = await getCurrentUser();
  if (!user?.id) throw new Error('Unauthorized');
  try {
    await updatePickupVehicle(
      new mongoose.Types.ObjectId(jobId),
      new mongoose.Types.ObjectId(pickupId),
      vehicleId ? new mongoose.Types.ObjectId(vehicleId) : null,
      new mongoose.Types.ObjectId(user.id)
    );
    revalidateJob(jobId);
    return { success: true, message: 'Jármű frissítve.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Csere sikertelen.' };
  }
}

export async function requestJobItemsAction(
  jobId: string,
  _prev: JobFormState,
  formData: FormData
): Promise<JobFormState> {
  const parsed = itemRequestSchema.safeParse({
    note: formData.get('note'),
    productId: formData.get('productId') || undefined,
    quantity: formData.get('quantity') || undefined,
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }
  try {
    const { actor } = await requireCrewActor(jobId, ['director']);
    await requestJobItems(new mongoose.Types.ObjectId(jobId), {
      note: parsed.data.note,
      productId: parsed.data.productId
        ? new mongoose.Types.ObjectId(parsed.data.productId)
        : undefined,
      quantity: parsed.data.quantity,
      actorUserId: actor.userId,
    });
    revalidateJob(jobId);
    return { success: true, message: 'Kérés elküldve a logisztikának.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Kérés sikertelen.' };
  }
}

export async function resolveItemRequestAction(
  jobId: string,
  requestId: string,
  decision: 'accepted' | 'rejected'
): Promise<JobFormState> {
  await requirePermission('logistics:write');
  const user = await getCurrentUser();
  if (!user?.id) throw new Error('Unauthorized');
  try {
    await resolveJobItemRequest(
      new mongoose.Types.ObjectId(jobId),
      new mongoose.Types.ObjectId(requestId),
      decision,
      new mongoose.Types.ObjectId(user.id)
    );
    revalidateJob(jobId);
    return {
      success: true,
      message: decision === 'accepted' ? 'Kérés elfogadva.' : 'Kérés elutasítva.',
    };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Bírálat sikertelen.' };
  }
}

export async function submitJobFeedbackAction(
  jobId: string,
  _prev: JobFormState,
  formData: FormData
): Promise<JobFormState> {
  const parsed = jobFeedbackSchema.safeParse({ feedback: formData.get('feedback') });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }
  try {
    const { actor } = await requireCrewActor(jobId, ['director']);
    await submitJobFeedback(new mongoose.Types.ObjectId(jobId), parsed.data.feedback, actor.userId);
    revalidateJob(jobId);
    return { success: true, message: 'Visszajelzés mentve.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Mentés sikertelen.' };
  }
}

export async function requireCrewActor(
  jobId: string,
  roles: CrewRole[]
): Promise<{ user: { id: string; permissions: string[] }; job: ILogisticsJob; actor: FieldActor }> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  const job = await loadJobOrThrow(new mongoose.Types.ObjectId(jobId));
  const actor = await resolveFieldActor(
    new mongoose.Types.ObjectId(user.id),
    user.permissions,
    job
  );
  assertCanPerformCrewRole(actor, job, roles);
  return { user, job, actor };
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

export async function previewPickupPlanAction(params: {
  demandJson: string;
  plannedEventAt?: string;
  plannedGatherAt?: string;
  plannedReturnAt?: string;
}): Promise<PreviewPickupPlanResult | { error: string }> {
  await requirePermission('logistics:write');
  try {
    const demand = parseDemandJson(params.demandJson);
    return await previewPickupPlan({
      demandLines: mapDemandLines(demand),
      plannedEventAt: parseOptionalDateTime(params.plannedEventAt),
      plannedGatherAt: parseOptionalDateTime(params.plannedGatherAt),
      plannedReturnAt: parseOptionalDateTime(params.plannedReturnAt),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Körök javaslata sikertelen.' };
  }
}
