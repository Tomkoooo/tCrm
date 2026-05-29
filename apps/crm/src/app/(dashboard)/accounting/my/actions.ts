'use server';

import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import { requireAuth } from '@crm/auth';
import {
  getEmployeeByUserId,
  submitHrRequest,
  cancelHrRequest,
  listScheduleEntries,
} from '@crm/core';
import { hrRequestSchema } from '@crm/lib/validation';
import { zodToFieldErrors, type HrFormState } from '../_components/form-utils';

async function requireMyEmployee() {
  const user = await requireAuth();
  if (!user) throw new Error('Unauthorized');
  const userId = new mongoose.Types.ObjectId(user.id);
  const emp = await getEmployeeByUserId(userId);
  if (!emp) throw new Error('Nincs dolgozói rekord ehhez a fiókhoz.');
  return { userId, emp };
}

export async function submitMyRequestAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  const { userId, emp } = await requireMyEmployee();

  const type = formData.get('type') as string;
  let parsed;
  if (type === 'holiday') {
    parsed = hrRequestSchema.safeParse({
      type: 'holiday',
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate'),
      reason: formData.get('reason') || undefined,
    });
  } else if (type === 'sick_leave') {
    parsed = hrRequestSchema.safeParse({
      type: 'sick_leave',
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate'),
      reason: formData.get('reason') || undefined,
      sickPayAmount: formData.get('sickPayAmount') || undefined,
    });
  } else {
    parsed = hrRequestSchema.safeParse({
      type: 'schedule_change',
      scheduleEntryId: formData.get('scheduleEntryId') || undefined,
      proposedStart: formData.get('proposedStart'),
      proposedEnd: formData.get('proposedEnd'),
      reason: formData.get('reason') || undefined,
    });
  }

  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  try {
    const data = parsed.data;
    await submitHrRequest(emp._id, userId, {
      type: data.type,
      startDate: 'startDate' in data ? data.startDate : undefined,
      endDate: 'endDate' in data ? data.endDate : undefined,
      reason: data.reason,
      sickPayAmount: 'sickPayAmount' in data ? data.sickPayAmount : undefined,
      scheduleEntryId:
        data.type === 'schedule_change' && data.scheduleEntryId
          ? new mongoose.Types.ObjectId(data.scheduleEntryId)
          : undefined,
      proposedStart: 'proposedStart' in data ? data.proposedStart : undefined,
      proposedEnd: 'proposedEnd' in data ? data.proposedEnd : undefined,
    });
    revalidatePath('/accounting/my');
    return { success: true, message: 'Kérelem beküldve.' };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Hiba történt.' };
  }
}

export async function cancelMyRequestAction(requestId: string): Promise<HrFormState> {
  const { userId } = await requireMyEmployee();

  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    return { success: false, message: 'Érvénytelen azonosító.' };
  }

  try {
    await cancelHrRequest(new mongoose.Types.ObjectId(requestId), userId);
    revalidatePath('/accounting/my');
    return { success: true, message: 'Kérelem visszavonva.' };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Hiba történt.' };
  }
}

export async function fetchMyScheduleAction(start: string, end: string) {
  const { emp } = await requireMyEmployee();

  const entries = await listScheduleEntries({
    start: new Date(start),
    end: new Date(end),
    employeeId: emp._id,
    allowedCompanyIds: null,
  });

  return entries.map((e) => ({
    id: e._id.toString(),
    title: e.title ?? e.kind,
    start: e.start.toISOString(),
    end: e.end.toISOString(),
    allDay: e.allDay ?? false,
    kind: e.kind,
  }));
}
