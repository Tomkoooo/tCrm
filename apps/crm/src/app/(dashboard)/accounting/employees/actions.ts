'use server';

import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import { requirePermission } from '@crm/auth';
import {
  createEmployee,
  updateEmployee,
  inviteEmployeeToUser,
  unlinkEmployeeUser,
} from '@crm/core';
import { employeeSchema, inviteEmployeeSchema } from '@crm/lib/validation';
import { zodToFieldErrors, type HrFormState } from '../_components/form-utils';
import { getHrSessionScope } from '@/lib/hr/session-scope';

export async function createEmployeeAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  await requirePermission('hr:write');
  const { userId, permissions } = await getHrSessionScope();

  const parsed = employeeSchema.safeParse({
    companyId: formData.get('companyId'),
    name: formData.get('name'),
    email: formData.get('email') || undefined,
    employeeNumber: formData.get('employeeNumber') || undefined,
    department: formData.get('department') || undefined,
    phone: formData.get('phone') || undefined,
    employmentType: formData.get('employmentType') || 'guest',
    isActive: formData.get('isActive') === 'on' || formData.get('isActive') === 'true',
    hrNotes: formData.get('hrNotes') || undefined,
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  if (!mongoose.Types.ObjectId.isValid(parsed.data.companyId)) {
    return { success: false, message: 'Érvénytelen cég.' };
  }

  try {
    const emp = await createEmployee(
      {
        companyId: new mongoose.Types.ObjectId(parsed.data.companyId),
        name: parsed.data.name,
        email: parsed.data.email || undefined,
        employeeNumber: parsed.data.employeeNumber,
        department: parsed.data.department,
        phone: parsed.data.phone,
        employmentType: parsed.data.employmentType,
        isActive: parsed.data.isActive,
        hrNotes: parsed.data.hrNotes,
      },
      userId,
      permissions
    );
    revalidatePath('/accounting/employees');
    return { success: true, message: 'Dolgozó létrehozva.', id: emp._id.toString() };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Hiba történt.' };
  }
}

export async function updateEmployeeAction(
  id: string,
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  await requirePermission('hr:write');
  const { userId, permissions } = await getHrSessionScope();

  const parsed = employeeSchema.safeParse({
    companyId: formData.get('companyId'),
    name: formData.get('name'),
    email: formData.get('email') || undefined,
    employeeNumber: formData.get('employeeNumber') || undefined,
    department: formData.get('department') || undefined,
    phone: formData.get('phone') || undefined,
    employmentType: formData.get('employmentType'),
    isActive: formData.get('isActive') === 'on' || formData.get('isActive') === 'true',
    hrNotes: formData.get('hrNotes') || undefined,
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { success: false, message: 'Érvénytelen azonosító.' };
  }

  try {
    await updateEmployee(
      new mongoose.Types.ObjectId(id),
      {
        companyId: new mongoose.Types.ObjectId(parsed.data.companyId),
        name: parsed.data.name,
        email: parsed.data.email || undefined,
        employeeNumber: parsed.data.employeeNumber,
        department: parsed.data.department,
        phone: parsed.data.phone,
        employmentType: parsed.data.employmentType,
        isActive: parsed.data.isActive,
        hrNotes: parsed.data.hrNotes,
      },
      userId,
      permissions
    );
    revalidatePath('/accounting/employees');
    revalidatePath(`/accounting/employees/${id}`);
    return { success: true, message: 'Dolgozó mentve.' };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Hiba történt.' };
  }
}

export async function inviteEmployeeAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  await requirePermission('hr:write');
  const { userId, permissions } = await getHrSessionScope();

  const parsed = inviteEmployeeSchema.safeParse({
    employeeId: formData.get('employeeId'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  try {
    await inviteEmployeeToUser(
      new mongoose.Types.ObjectId(parsed.data.employeeId),
      parsed.data.password,
      userId,
      permissions
    );
    revalidatePath('/accounting/employees');
    revalidatePath(`/accounting/employees/${parsed.data.employeeId}`);
    return { success: true, message: 'Felhasználó létrehozva és összekötve.' };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Hiba történt.' };
  }
}

export async function unlinkEmployeeAction(employeeId: string): Promise<HrFormState> {
  await requirePermission('hr:write');
  const { userId, permissions } = await getHrSessionScope();

  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    return { success: false, message: 'Érvénytelen azonosító.' };
  }

  try {
    await unlinkEmployeeUser(new mongoose.Types.ObjectId(employeeId), userId, permissions);
    revalidatePath('/accounting/employees');
    revalidatePath(`/accounting/employees/${employeeId}`);
    return { success: true, message: 'Fiók leválasztva.' };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Hiba történt.' };
  }
}
