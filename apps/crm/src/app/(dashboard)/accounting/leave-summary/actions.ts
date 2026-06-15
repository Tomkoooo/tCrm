'use server';

import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import { requirePermission } from '@crm/auth';
import { connectDB, Employee } from '@crm/db';
import { upsertEmployeeLeaveYear } from '@crm/core';
import { employeeLeaveYearSchema } from '@crm/lib/validation';
import { getHrSessionScope } from '@/lib/hr/session-scope';
import { zodToFieldErrors, type HrFormState } from '../_components/form-utils';

export async function saveLeaveEntitlementAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  await requirePermission('hr:reports');
  const { userId, permissions } = await getHrSessionScope();

  const parsed = employeeLeaveYearSchema.safeParse({
    employeeId: formData.get('employeeId'),
    year: formData.get('year'),
    entitlementDays: formData.get('entitlementDays'),
    notes: formData.get('notes') || undefined,
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  await connectDB();
  const emp = await Employee.findById(parsed.data.employeeId).exec();
  if (!emp) return { success: false, message: 'Dolgozó nem található.' };

  try {
    await upsertEmployeeLeaveYear(
      new mongoose.Types.ObjectId(parsed.data.employeeId),
      emp.companyId,
      parsed.data.year,
      parsed.data.entitlementDays,
      userId,
      userId,
      permissions,
      parsed.data.notes
    );
    revalidatePath('/accounting/leave-summary');
    return { success: true, message: 'Éves keret mentve.' };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Hiba történt.' };
  }
}
