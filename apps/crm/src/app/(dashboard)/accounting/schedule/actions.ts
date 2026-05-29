'use server';

import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import { requirePermission, requireAnyPermission } from '@crm/auth';
import {
  createScheduleEntry,
  updateScheduleEntry,
  deleteScheduleEntry,
  listScheduleEntries,
} from '@crm/core';
import { scheduleEntrySchema } from '@crm/lib/validation';
import { HR_READ_PERMISSION_KEYS } from '@crm/lib';
import { zodToFieldErrors, type HrFormState } from '../_components/form-utils';
import { getHrSessionScope } from '@/lib/hr/session-scope';

export async function fetchScheduleEventsAction(params: {
  start: string;
  end: string;
  employeeId?: string;
  companyId?: string;
}) {
  await requireAnyPermission([...HR_READ_PERMISSION_KEYS]);
  const { userId, permissions, allowedCompanyIds } = await getHrSessionScope();

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

  return entries.map((e) => ({
    id: e._id.toString(),
    title: e.title ?? (e.kind === 'shift' ? 'Műszak' : e.kind),
    start: e.start.toISOString(),
    end: e.end.toISOString(),
    allDay: e.allDay ?? false,
    kind: e.kind,
    employeeId: e.employeeId.toString(),
  }));
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
