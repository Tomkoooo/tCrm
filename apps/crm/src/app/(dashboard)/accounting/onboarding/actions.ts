'use server';

import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import { requireAuth } from '@crm/auth';
import {
  completeEmployeeOnboarding,
  listEmployeesForUser,
  userNeedsEmployeeOnboarding,
} from '@crm/core';
import { z } from '@crm/lib';
import { setActiveEmployeeCookie } from '@/lib/hr/active-employee';
import { zodToFieldErrors, type HrFormState } from '../_components/form-utils';

const onboardingSchema = z.object({
  employeeId: z.string().min(1),
  employeeNumber: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  hrNotes: z.string().optional(),
});

export async function completeOnboardingAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  const user = await requireAuth();
  if (!user) return { success: false, message: 'Bejelentkezés szükséges.' };

  const parsed = onboardingSchema.safeParse({
    employeeId: formData.get('employeeId'),
    employeeNumber: formData.get('employeeNumber') || undefined,
    department: formData.get('department') || undefined,
    phone: formData.get('phone') || undefined,
    hrNotes: formData.get('hrNotes') || undefined,
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  const userId = new mongoose.Types.ObjectId(user.id);
  if (!mongoose.Types.ObjectId.isValid(parsed.data.employeeId)) {
    return { success: false, message: 'Érvénytelen dolgozó.' };
  }

  try {
    await completeEmployeeOnboarding(userId, new mongoose.Types.ObjectId(parsed.data.employeeId), {
      employeeNumber: parsed.data.employeeNumber,
      department: parsed.data.department,
      phone: parsed.data.phone,
      hrNotes: parsed.data.hrNotes,
    });
    await setActiveEmployeeCookie(parsed.data.employeeId);
    revalidatePath('/accounting/my');
    revalidatePath('/accounting/onboarding');
    return { success: true, message: 'Profil mentve.' };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Hiba történt.' };
  }
}

export async function getOnboardingContextAction() {
  const user = await requireAuth();
  if (!user) return null;

  const userId = new mongoose.Types.ObjectId(user.id);
  const needs = await userNeedsEmployeeOnboarding(userId);
  if (!needs) return { needsOnboarding: false as const, employees: [] };

  const employees = await listEmployeesForUser(userId);
  return {
    needsOnboarding: true as const,
    employees: employees.map((e) => ({
      _id: e._id.toString(),
      name: e.name,
      companyId: e.companyId.toString(),
      employeeNumber: e.employeeNumber ?? '',
      department: e.department ?? '',
      phone: e.phone ?? '',
      hrNotes: e.hrNotes ?? '',
    })),
  };
}

export async function setActiveEmployeeAction(employeeId: string): Promise<HrFormState> {
  const user = await requireAuth();
  if (!user) return { success: false, message: 'Bejelentkezés szükséges.' };

  const userId = new mongoose.Types.ObjectId(user.id);
  const employees = await listEmployeesForUser(userId);
  if (!employees.some((e) => e._id.toString() === employeeId)) {
    return { success: false, message: 'Érvénytelen dolgozói profil.' };
  }

  await setActiveEmployeeCookie(employeeId);
  revalidatePath('/accounting/my');
  return { success: true };
}
