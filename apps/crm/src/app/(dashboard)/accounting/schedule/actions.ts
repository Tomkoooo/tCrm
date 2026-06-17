'use server';

import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import { requirePermission, requireAnyPermission, requireAuth } from '@crm/auth';
import {
  createScheduleEntry,
  updateScheduleEntry,
  deleteScheduleEntry,
  listScheduleEntries,
  bulkCreateScheduleEntries,
  listManagedEmployeeIds,
  userLeadsAnyTeam,
  assertCanReadTeamSchedule,
} from '@crm/core';
import {
  scheduleEntrySchema,
  bulkScheduleSchema,
  scheduleEntryUpdateSchema,
} from '@crm/lib/validation';
import { HR_READ_PERMISSION_KEYS, resolveEmployeeScheduleColor, formatHrTime } from '@crm/lib';
import { connectDB, Employee } from '@crm/db';
import { zodToFieldErrors, type HrFormState } from '../_components/form-utils';
import { getHrSessionScope } from '@/lib/hr/session-scope';

function mapEntryToEvent(
  e: Awaited<ReturnType<typeof listScheduleEntries>>[number],
  employeeById: Map<string, { name?: string; calendarColor?: string | null }>
) {
  const empId = e.employeeId.toString();
  const emp = employeeById.get(empId);
  const locationsList = e.locations?.length
    ? e.locations
        .map((loc) => `${loc.label} (${formatHrTime(loc.start)}–${formatHrTime(loc.end)})`)
        .join(', ')
    : [e.locationLabel, e.locationAddress].filter(Boolean).join(' — ');
  const baseTitle = e.title ?? (e.kind === 'shift' ? 'Műszak' : e.kind);
  return {
    id: e._id.toString(),
    title: locationsList ? `${baseTitle} · ${locationsList}` : baseTitle,
    start: e.start.toISOString(),
    end: e.end.toISOString(),
    allDay: e.allDay ?? false,
    kind: e.kind,
    employeeId: empId,
    employeeName: emp?.name,
    locationLabel: e.locationLabel,
    locationAddress: e.locationAddress,
    locations: e.locations?.map((loc) => ({
      label: loc.label,
      address: loc.address,
      start: loc.start.toISOString(),
      end: loc.end.toISOString(),
    })),
    color: resolveEmployeeScheduleColor(empId, emp?.calendarColor),
  };
}

async function loadEmployeeMap(employeeIds: string[]) {
  await connectDB();
  const employees =
    employeeIds.length > 0
      ? await Employee.find({ _id: { $in: employeeIds } })
          .select({ name: 1, calendarColor: 1 })
          .lean()
          .exec()
      : [];
  return new Map(employees.map((e) => [String(e._id), e]));
}

async function requireScheduleWriteAccess() {
  const scope = await getHrSessionScope();
  if (scope.permissions.includes('hr:write')) return scope;
  const leads = await userLeadsAnyTeam(scope.userId);
  if (!leads) {
    await requirePermission('hr:write');
  }
  return scope;
}

export async function fetchScheduleEventsAction(params: {
  start: string;
  end: string;
  employeeId?: string;
  companyId?: string;
}) {
  await requireAnyPermission([...HR_READ_PERMISSION_KEYS]);
  const { allowedCompanyIds } = await getHrSessionScope();

  const entries = await listScheduleEntries({
    start: new Date(params.start),
    end: new Date(params.end),
    employeeId:
      params.employeeId && mongoose.Types.ObjectId.isValid(params.employeeId)
        ? new mongoose.Types.ObjectId(params.employeeId)
        : undefined,
    companyId:
      params.companyId && mongoose.Types.ObjectId.isValid(params.companyId)
        ? new mongoose.Types.ObjectId(params.companyId)
        : undefined,
    allowedCompanyIds,
  });

  const employeeById = await loadEmployeeMap([
    ...new Set(entries.map((e) => String(e.employeeId))),
  ]);
  return entries.map((e) => mapEntryToEvent(e, employeeById));
}

export async function fetchTeamScheduleEventsAction(params: {
  start: string;
  end: string;
  companyId?: string;
}) {
  const scope = await getHrSessionScope();
  await assertCanReadTeamSchedule(scope.userId, scope.permissions);

  const companyOid =
    params.companyId && mongoose.Types.ObjectId.isValid(params.companyId)
      ? new mongoose.Types.ObjectId(params.companyId)
      : undefined;

  const managedIds = await listManagedEmployeeIds(scope.userId, companyOid, scope.permissions);
  if (!managedIds.length) return [];

  const entries = await listScheduleEntries({
    start: new Date(params.start),
    end: new Date(params.end),
    employeeIds: managedIds,
    companyId: companyOid,
    allowedCompanyIds: scope.allowedCompanyIds,
  });

  const employeeById = await loadEmployeeMap([
    ...new Set(entries.map((e) => String(e.employeeId))),
  ]);
  return entries.map((e) => mapEntryToEvent(e, employeeById));
}

export async function createScheduleEntryAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  const { userId, permissions } = await requireScheduleWriteAccess();

  const locationsRaw = formData.get('locationsJson');
  let locations: any[] | undefined = undefined;
  if (locationsRaw && typeof locationsRaw === 'string') {
    try {
      locations = JSON.parse(locationsRaw);
    } catch {
      // ignore
    }
  }

  const parsed = scheduleEntrySchema.safeParse({
    employeeId: formData.get('employeeId'),
    start: formData.get('start'),
    end: formData.get('end'),
    allDay: formData.get('allDay') === 'true',
    kind: formData.get('kind') || 'shift',
    title: formData.get('title') || undefined,
    notes: formData.get('notes') || undefined,
    locationLabel: formData.get('locationLabel') || undefined,
    locationAddress: formData.get('locationAddress') || undefined,
    locations,
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  try {
    const entry = await createScheduleEntry(
      {
        employeeId: new mongoose.Types.ObjectId(parsed.data.employeeId),
        start: parsed.data.start,
        end: parsed.data.end,
        allDay: parsed.data.allDay,
        kind: parsed.data.kind,
        title: parsed.data.title,
        notes: parsed.data.notes,
        locationLabel: parsed.data.locationLabel,
        locationAddress: parsed.data.locationAddress,
        locations: parsed.data.locations,
      },
      userId,
      permissions
    );
    revalidatePath('/accounting/schedule');
    revalidatePath('/accounting/my-team/schedule');
    return { success: true, id: entry._id.toString() };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Hiba történt.' };
  }
}

export async function updateScheduleEntryAction(
  id: string,
  data: { start: string; end: string }
): Promise<HrFormState> {
  const { userId, permissions } = await requireScheduleWriteAccess();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { success: false, message: 'Érvénytelen azonosító.' };
  }

  try {
    await updateScheduleEntry(
      new mongoose.Types.ObjectId(id),
      { start: new Date(data.start), end: new Date(data.end) },
      userId,
      permissions
    );
    revalidatePath('/accounting/schedule');
    revalidatePath('/accounting/my-team/schedule');
    return { success: true };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Hiba történt.' };
  }
}

export async function updateScheduleEntryFormAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  const { userId, permissions } = await requireScheduleWriteAccess();

  const locationsRaw = formData.get('locationsJson');
  let locations: any[] | undefined = undefined;
  if (locationsRaw && typeof locationsRaw === 'string') {
    try {
      locations = JSON.parse(locationsRaw);
    } catch {
      // ignore
    }
  }

  const parsed = scheduleEntryUpdateSchema.safeParse({
    id: formData.get('id'),
    start: formData.get('start'),
    end: formData.get('end'),
    allDay: formData.get('allDay') === 'true',
    kind: formData.get('kind') || 'shift',
    title: formData.get('title') || undefined,
    notes: formData.get('notes') || undefined,
    locationLabel: formData.get('locationLabel') || undefined,
    locationAddress: formData.get('locationAddress') || undefined,
    locations,
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  if (!mongoose.Types.ObjectId.isValid(parsed.data.id)) {
    return { success: false, message: 'Érvénytelen azonosító.' };
  }

  try {
    await updateScheduleEntry(
      new mongoose.Types.ObjectId(parsed.data.id),
      {
        start: parsed.data.start,
        end: parsed.data.end,
        allDay: parsed.data.allDay,
        kind: parsed.data.kind,
        title: parsed.data.title,
        notes: parsed.data.notes,
        locationLabel: parsed.data.locationLabel,
        locationAddress: parsed.data.locationAddress,
        locations: parsed.data.locations,
      },
      userId,
      permissions
    );
    revalidatePath('/accounting/schedule');
    revalidatePath('/accounting/my-team/schedule');
    return { success: true };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Hiba történt.' };
  }
}

export async function deleteScheduleEntryAction(id: string): Promise<HrFormState> {
  const { userId, permissions } = await requireScheduleWriteAccess();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { success: false, message: 'Érvénytelen azonosító.' };
  }

  try {
    await deleteScheduleEntry(new mongoose.Types.ObjectId(id), userId, permissions);
    revalidatePath('/accounting/schedule');
    revalidatePath('/accounting/my-team/schedule');
    return { success: true };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Hiba történt.' };
  }
}

export async function bulkScheduleAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  const { userId, permissions } = await requireScheduleWriteAccess();

  const employeeIds = formData.getAll('employeeIds').map(String);
  const selectedRaw = String(formData.get('selectedDates') ?? '');
  const selectedDates = selectedRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const parsed = bulkScheduleSchema.safeParse({
    employeeIds,
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate'),
    shiftStartTime: String(formData.get('shiftStartTime') ?? '09:00').slice(0, 5),
    shiftEndTime: String(formData.get('shiftEndTime') ?? '17:00').slice(0, 5),
    mode: formData.get('mode') || 'workdays',
    selectedDates: selectedDates.length ? selectedDates : undefined,
    skipExisting: formData.get('skipExisting') === 'true',
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  try {
    const result = await bulkCreateScheduleEntries(
      {
        employeeIds: parsed.data.employeeIds.map((id: string) => new mongoose.Types.ObjectId(id)),
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        shiftStartTime: parsed.data.shiftStartTime,
        shiftEndTime: parsed.data.shiftEndTime,
        mode: parsed.data.mode,
        selectedDates: parsed.data.selectedDates,
        skipExisting: parsed.data.skipExisting,
        locationLabel: String(formData.get('locationLabel') ?? '').trim() || undefined,
        locationAddress: String(formData.get('locationAddress') ?? '').trim() || undefined,
      },
      userId,
      permissions
    );
    revalidatePath('/accounting/schedule');
    revalidatePath('/accounting/my-team/schedule');
    return {
      success: true,
      message: `${result.created} műszak létrehozva, ${result.skipped} kihagyva.`,
    };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Hiba történt.' };
  }
}

export async function checkUserLeadsTeamAction(): Promise<boolean> {
  const user = await requireAuth();
  if (!user) return false;
  return userLeadsAnyTeam(new mongoose.Types.ObjectId(user.id));
}
