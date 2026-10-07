'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser, requireAnyPermission } from '@crm/auth';
import {
  cellKey,
  clearPlanCell,
  createSchedulePlan,
  deleteSchedulePlan,
  getSchedulePlanGrid,
  listPlanChangeRequests,
  notifyScheduleChangeReviewed,
  publishSchedulePlan,
  reviewScheduleChangeRequest,
  updateSchedulePlan,
  upsertPlanCell,
  HR_SCHEDULE_WRITE_PERMISSION_KEYS,
} from '@crm/hr';
import {
  schedulePlanCellSchema,
  schedulePlanCreateSchema,
  schedulePlanDayNoteSchema,
  schedulePlanPublishSchema,
  schedulePlanUpdateSchema,
  scheduleChangeReviewSchema,
} from '@crm/lib/validation';

export type FormState =
  | { success: false; fieldErrors?: Record<string, string[]>; message?: string }
  | { success: true; message?: string; planId?: string };

export type ActionResult<T = undefined> =
  | { success: false; message: string }
  | ({ success: true; message?: string } & (T extends undefined ? object : { data: T }));

function fieldErrorsFrom(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>
) {
  const out: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || 'form';
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

async function requireScheduleWriter() {
  await requireAnyPermission([...HR_SCHEDULE_WRITE_PERMISSION_KEYS]);
  const user = await getCurrentUser();
  if (!user?.id) throw new Error('Nincs bejelentkezve.');
  return user;
}

function revalidatePlan(planId: string) {
  revalidatePath('/hr/schedules');
  revalidatePath(`/hr/schedules/${planId}`);
  revalidatePath('/hr/calendar');
  revalidatePath('/hr/me');
}

export async function createSchedulePlanAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  let user;
  try {
    user = await requireScheduleWriter();
  } catch (err) {
    return { success: false, message: errorMessage(err, 'Nincs jogosultság.') };
  }

  const parsed = schedulePlanCreateSchema.safeParse({
    title: formData.get('title'),
    companyId: formData.get('companyId'),
    startDateKey: formData.get('startDateKey'),
    endDateKey: formData.get('endDateKey'),
    employeeIds: formData.getAll('employeeIds').map(String).filter(Boolean),
    defaultShiftHours: formData.get('defaultShiftHours') || undefined,
    defaultStartTime: formData.get('defaultStartTime') || undefined,
    notes: formData.get('notes'),
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  try {
    const plan = await createSchedulePlan({ ...parsed.data, actorUserId: user.id });
    revalidatePath('/hr/schedules');
    return { success: true, planId: String(plan._id), message: 'Beosztás létrehozva.' };
  } catch (err) {
    return { success: false, message: errorMessage(err, 'A beosztás létrehozása sikertelen.') };
  }
}

export async function updateSchedulePlanAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  let user;
  try {
    user = await requireScheduleWriter();
  } catch (err) {
    return { success: false, message: errorMessage(err, 'Nincs jogosultság.') };
  }

  const employeeIds = formData.getAll('employeeIds').map(String).filter(Boolean);
  const parsed = schedulePlanUpdateSchema.safeParse({
    id: formData.get('id'),
    title: formData.get('title') || undefined,
    defaultShiftHours: formData.get('defaultShiftHours') || undefined,
    defaultStartTime: formData.get('defaultStartTime') || undefined,
    employeeIds: employeeIds.length ? employeeIds : undefined,
    notes: formData.get('notes'),
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  try {
    const plan = await updateSchedulePlan({ ...parsed.data, actorUserId: user.id });
    revalidatePlan(String(plan._id));
    return { success: true, planId: String(plan._id), message: 'Beosztás mentve.' };
  } catch (err) {
    return { success: false, message: errorMessage(err, 'A mentés sikertelen.') };
  }
}

export type SavedCell = {
  place: string;
  startTime: string;
  endTime: string;
  description?: string;
  hours: number;
  overnight: boolean;
};

/**
 * Writes one grid cell. The place is what makes a cell exist — clearing it removes
 * the shift. Times left blank fall back to the plan defaults.
 */
export async function setSchedulePlanCellAction(input: {
  planId: string;
  employeeId: string;
  dayKey: string;
  place: string;
  startTime?: string;
  endTime?: string;
  description?: string;
}): Promise<ActionResult<{ cell: SavedCell | null }>> {
  let user;
  try {
    user = await requireScheduleWriter();
  } catch (err) {
    return { success: false, message: errorMessage(err, 'Nincs jogosultság.') };
  }

  const parsed = schedulePlanCellSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Érvénytelen érték.' };
  }

  const { planId, employeeId, dayKey, place, startTime, endTime, description } = parsed.data;

  try {
    if (!place.trim()) {
      await clearPlanCell({ planId, employeeId, dayKey });
      revalidatePlan(planId);
      return { success: true, data: { cell: null } };
    }

    await upsertPlanCell({
      planId,
      employeeId,
      dayKey,
      place,
      startTime,
      endTime,
      description,
      actorUserId: user.id,
    });

    // Read the cell back so the grid shows the resolved times, not the blanks.
    const grid = await getSchedulePlanGrid(planId);
    const saved = grid?.cells.get(cellKey(employeeId, dayKey));
    revalidatePlan(planId);

    return {
      success: true,
      data: {
        cell: saved
          ? {
              place: saved.place,
              startTime: saved.startTime,
              endTime: saved.endTime,
              description: saved.description,
              hours: saved.hours,
              overnight: saved.overnight,
            }
          : null,
      },
    };
  } catch (err) {
    return { success: false, message: errorMessage(err, 'A cella mentése sikertelen.') };
  }
}

/** Applies one cell value to a whole employee column or a whole day row. */
export async function fillSchedulePlanAction(input: {
  planId: string;
  place: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  employeeId?: string;
  dayKey?: string;
  /** Only overwrite cells that are currently empty. */
  onlyEmpty?: boolean;
  /** Skip Saturdays and Sundays. */
  skipWeekends?: boolean;
}): Promise<ActionResult<{ changed: number }>> {
  let user;
  try {
    user = await requireScheduleWriter();
  } catch (err) {
    return { success: false, message: errorMessage(err, 'Nincs jogosultság.') };
  }

  if (!input.employeeId && !input.dayKey) {
    return { success: false, message: 'Adj meg dolgozót vagy napot a kitöltéshez.' };
  }

  const grid = await getSchedulePlanGrid(input.planId);
  if (!grid) return { success: false, message: 'Beosztás nem található.' };

  const place = input.place?.trim() ?? '';
  const targets: Array<{ employeeId: string; dayKey: string }> = [];

  for (const employee of grid.employees) {
    const employeeId = String(employee._id);
    if (input.employeeId && employeeId !== input.employeeId) continue;
    for (const dayKey of grid.dayKeys) {
      if (input.dayKey && dayKey !== input.dayKey) continue;
      if (input.onlyEmpty && grid.cells.has(cellKey(employeeId, dayKey))) continue;
      if (input.skipWeekends) {
        const [y, m, d] = dayKey.split('-').map(Number);
        const weekday = new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
        if (weekday === 0 || weekday === 6) continue;
      }
      targets.push({ employeeId, dayKey });
    }
  }

  let changed = 0;
  try {
    for (const target of targets) {
      if (!place) {
        if (await clearPlanCell({ planId: input.planId, ...target })) changed++;
        continue;
      }
      await upsertPlanCell({
        planId: input.planId,
        ...target,
        place,
        startTime: input.startTime,
        endTime: input.endTime,
        description: input.description,
        actorUserId: user.id,
      });
      changed++;
    }
  } catch (err) {
    return { success: false, message: errorMessage(err, 'A kitöltés sikertelen.') };
  }

  revalidatePlan(input.planId);
  return { success: true, data: { changed }, message: `${changed} cella frissítve.` };
}

export async function setSchedulePlanDayNoteAction(input: {
  planId: string;
  dayKey: string;
  notes: string[];
}): Promise<ActionResult> {
  let user;
  try {
    user = await requireScheduleWriter();
  } catch (err) {
    return { success: false, message: errorMessage(err, 'Nincs jogosultság.') };
  }

  const parsed = schedulePlanDayNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Érvénytelen érték.' };
  }

  try {
    await updateSchedulePlan({
      id: parsed.data.planId,
      dayNotes: { [parsed.data.dayKey]: parsed.data.notes },
      actorUserId: user.id,
    });
    revalidatePlan(parsed.data.planId);
    return { success: true };
  } catch (err) {
    return { success: false, message: errorMessage(err, 'A megjegyzés mentése sikertelen.') };
  }
}

export type PublishSummary = {
  sentCount: number;
  skippedCount: number;
  recipients: Array<{
    employeeName: string;
    email?: string;
    shiftCount: number;
    sent: boolean;
    skippedReason?: string;
  }>;
};

export async function publishSchedulePlanAction(input: {
  id: string;
  employeeIds?: string[];
  skipEmptyColumns?: boolean;
}): Promise<ActionResult<PublishSummary>> {
  let user;
  try {
    user = await requireScheduleWriter();
  } catch (err) {
    return { success: false, message: errorMessage(err, 'Nincs jogosultság.') };
  }

  const parsed = schedulePlanPublishSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Érvénytelen kérés.' };
  }

  try {
    const result = await publishSchedulePlan({
      planId: parsed.data.id,
      actorUserId: user.id,
      employeeIds: parsed.data.employeeIds,
      skipEmptyColumns: parsed.data.skipEmptyColumns,
    });

    revalidatePlan(parsed.data.id);

    const message =
      result.skippedCount === 0
        ? `Kiküldve ${result.sentCount} dolgozónak.`
        : `Kiküldve ${result.sentCount} dolgozónak, ${result.skippedCount} kimaradt (lásd alább).`;

    return {
      success: true,
      message,
      data: {
        sentCount: result.sentCount,
        skippedCount: result.skippedCount,
        recipients: result.recipients.map((r) => ({
          employeeName: r.employeeName,
          email: r.email,
          shiftCount: r.shiftCount,
          sent: r.sent,
          skippedReason: r.skippedReason,
        })),
      },
    };
  } catch (err) {
    return { success: false, message: errorMessage(err, 'A kiküldés sikertelen.') };
  }
}

export async function deleteSchedulePlanAction(id: string): Promise<ActionResult> {
  try {
    await requireScheduleWriter();
  } catch (err) {
    return { success: false, message: errorMessage(err, 'Nincs jogosultság.') };
  }

  try {
    await deleteSchedulePlan(id);
    revalidatePath('/hr/schedules');
    revalidatePath('/hr/calendar');
    return { success: true, message: 'Beosztás törölve.' };
  } catch (err) {
    return { success: false, message: errorMessage(err, 'A törlés sikertelen.') };
  }
}

/** Accept or decline an employee's change request and e-mail them the decision. */
export async function reviewSchedulePlanRequestAction(input: {
  id: string;
  decision: 'approved' | 'rejected';
  reviewNote?: string;
}): Promise<ActionResult<{ mailSent: boolean; mailReason?: string }>> {
  let user;
  try {
    user = await requireScheduleWriter();
  } catch (err) {
    return { success: false, message: errorMessage(err, 'Nincs jogosultság.') };
  }

  const parsed = scheduleChangeReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Érvénytelen kérés.' };
  }

  try {
    const request = await reviewScheduleChangeRequest(
      parsed.data.id,
      parsed.data.decision,
      user.id,
      parsed.data.reviewNote
    );

    // The decision stands even if the notification can't go out; report both.
    const mail = await notifyScheduleChangeReviewed(request);

    revalidatePath('/hr/me');
    revalidatePath('/hr/calendar');
    revalidatePath('/hr/schedules');

    const label = parsed.data.decision === 'approved' ? 'elfogadva' : 'elutasítva';
    return {
      success: true,
      message: mail.sent
        ? `Kérelem ${label}, a dolgozó értesítve.`
        : `Kérelem ${label}. Értesítés nem ment ki: ${mail.reason ?? 'ismeretlen ok'}.`,
      data: { mailSent: mail.sent, mailReason: mail.reason },
    };
  } catch (err) {
    return { success: false, message: errorMessage(err, 'Az elbírálás sikertelen.') };
  }
}

export async function listPlanChangeRequestsAction(planId: string) {
  await requireAnyPermission([...HR_SCHEDULE_WRITE_PERMISSION_KEYS]);
  return listPlanChangeRequests(planId);
}
