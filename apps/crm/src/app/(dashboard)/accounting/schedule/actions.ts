'use server';

import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import { requirePermission, requireAnyPermission } from '@crm/auth';
import {
  createScheduleEntry,
  updateScheduleEntry,
  deleteScheduleEntry,
  listScheduleEntries,
  bulkCreateScheduleEntries,
} from '@crm/core';
import {
  scheduleEntrySchema,
  bulkScheduleSchema,
  scheduleEntryUpdateSchema,
} from '@crm/lib/validation';
import { HR_READ_PERMISSION_KEYS, resolveEmployeeScheduleColor } from '@crm/lib';
import { connectDB, Employee } from '@crm/db';
import { zodToFieldErrors, type HrFormState } from '../_components/form-utils';
import { getHrSessionScope } from '@/lib/hr/session-scope';

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

  await connectDB();
  const employeeIds = [...new Set(entries.map((e) => String(e.employeeId)))];
  const employees =
    employeeIds.length > 0
      ? await Employee.find({ _id: { $in: employeeIds } })
          .select({ name: 1, calendarColor: 1 })
          .lean()
          .exec()
      : [];
  const employeeById = new Map(employees.map((e) => [String(e._id), e]));

  return entries.map((e) => {
    const empId = e.employeeId.toString();
    const emp = employeeById.get(empId);
    return {
      id: e._id.toString(),
      title: e.title ?? (e.kind === 'shift' ? 'Műszak' : e.kind),
      start: e.start.toISOString(),
      end: e.end.toISOString(),
      allDay: e.allDay ?? false,
      kind: e.kind,
      employeeId: empId,
      employeeName: emp?.name,
      color: resolveEmployeeScheduleColor(empId, emp?.calendarColor),
    };
  });
}

export async function createScheduleEntryAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  await requirePermission('hr:write');
  const { userId, permissions } = await getHrSessionScope();

  const parsed = scheduleEntrySchema.safeParse({
    employeeId: formData.get('employeeId'),
    start: formData.get('start'),
    end: formData.get('end'),
    allDay: formData.get('allDay') === 'true',
    kind: formData.get('kind') || 'shift',
    title: formData.get('title') || undefined,
    notes: formData.get('notes') || undefined,
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
      },
      userId,
      permissions
    );
    revalidatePath('/accounting/schedule');
    return { success: true, id: entry._id.toString() };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Hiba történt.' };
  }
}

export async function updateScheduleEntryAction(
  id: string,
  data: { start: string; end: string }
): Promise<HrFormState> {
  await requirePermission('hr:write');
  const { userId, permissions } = await getHrSessionScope();

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
    return { success: true };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Hiba történt.' };
  }
}

export async function updateScheduleEntryFormAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  await requirePermission('hr:write');
  const { userId, permissions } = await getHrSessionScope();

  const parsed = scheduleEntryUpdateSchema.safeParse({
    id: formData.get('id'),
    start: formData.get('start'),
    end: formData.get('end'),
    allDay: formData.get('allDay') === 'true',
    kind: formData.get('kind') || 'shift',
    title: formData.get('title') || undefined,
    notes: formData.get('notes') || undefined,
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
      },
      userId,
      permissions
    );
    revalidatePath('/accounting/schedule');
    return { success: true };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Hiba történt.' };
  }
}

export async function deleteScheduleEntryAction(id: string): Promise<HrFormState> {
  await requirePermission('hr:write');
  const { userId, permissions } = await getHrSessionScope();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { success: false, message: 'Érvénytelen azonosító.' };
  }

  try {
    await deleteScheduleEntry(new mongoose.Types.ObjectId(id), userId, permissions);
    revalidatePath('/accounting/schedule');
    return { success: true };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Hiba történt.' };
  }
}

export async function bulkScheduleAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  await requirePermission('hr:write');
  const { userId, permissions } = await getHrSessionScope();

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
      },
      userId,
      permissions
    );
    revalidatePath('/accounting/schedule');
    return {
      success: true,
      message: `${result.created} műszak létrehozva, ${result.skipped} kihagyva.`,
    };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Hiba történt.' };
  }
}
