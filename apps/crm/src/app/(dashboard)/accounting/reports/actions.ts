'use server';

import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import { requirePermission } from '@crm/auth';
import {
  upsertMonthlyWorkSummary,
  suggestMonthlyFromSchedule,
  suggestWorkedHoursFromSchedule,
} from '@crm/core';
import { monthlyWorkSummarySchema } from '@crm/lib/validation';
import { zodToFieldErrors, type HrFormState } from '../_components/form-utils';
import { getHrSessionScope } from '@/lib/hr/session-scope';

export async function saveMonthlySummaryAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  await requirePermission('hr:reports');
  const { userId, permissions } = await getHrSessionScope();

  const parsed = monthlyWorkSummarySchema.safeParse({
    employeeId: formData.get('employeeId'),
    year: formData.get('year'),
    month: formData.get('month'),
    workedHours: formData.get('workedHours'),
    holidayDays: formData.get('holidayDays'),
    sickDays: formData.get('sickDays'),
    sickPayAmount: formData.get('sickPayAmount') || undefined,
    notes: formData.get('notes') || undefined,
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  try {
    await upsertMonthlyWorkSummary(
      {
        employeeId: new mongoose.Types.ObjectId(parsed.data.employeeId),
        year: parsed.data.year,
        month: parsed.data.month,
        workedHours: parsed.data.workedHours,
        holidayDays: parsed.data.holidayDays,
        sickDays: parsed.data.sickDays,
        sickPayAmount: parsed.data.sickPayAmount,
        notes: parsed.data.notes,
      },
      userId,
      permissions
    );
    revalidatePath('/accounting/leave-summary');
    revalidatePath('/accounting/reports');
    return { success: true, message: 'Kimutatás mentve.' };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Hiba történt.' };
  }
}

export async function suggestHoursAction(
  employeeId: string,
  year: number,
  month: number
): Promise<{ hours: number } | { error: string }> {
  await requirePermission('hr:reports');
  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    return { error: 'Érvénytelen dolgozó.' };
  }
  const hours = await suggestWorkedHoursFromSchedule(
    new mongoose.Types.ObjectId(employeeId),
    year,
    month
  );
  return { hours };
}

export async function suggestMonthlyFromScheduleAction(
  employeeId: string,
  year: number,
  month: number
): Promise<
  | {
      workedHours: number;
      holidayDays: number;
      sickDays: number;
      holidayDatesLabel: string;
      sickDatesLabel: string;
    }
  | { error: string }
> {
  await requirePermission('hr:reports');
  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    return { error: 'Érvénytelen dolgozó.' };
  }
  return suggestMonthlyFromSchedule(new mongoose.Types.ObjectId(employeeId), year, month);
}
