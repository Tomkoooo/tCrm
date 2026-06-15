'use server';

import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import { requirePermission } from '@crm/auth';
import {
  createEmployee,
  updateEmployee,
  inviteEmployeeToUser,
  unlinkEmployeeUser,
  searchUsersForHrLink,
  linkGuestEmployeeToExistingUser,
  linkGuestEmployeeByEmailMatch,
  linkAllGuestEmployeesByEmailMatch,
  addEmployeeToAnotherCompany,
  deleteEmployee,
} from '@crm/core';
import { createAndSendInvitation } from '@crm/core';
import { connectDB, Employee, Role } from '@crm/db';
import {
  employeeSchema,
  inviteEmployeeSchema,
  searchUsersSchema,
  addEmployeeToCompanySchema,
} from '@crm/lib/validation';
import { zodToFieldErrors, type HrFormState } from '../_components/form-utils';
import { getHrSessionScope } from '@/lib/hr/session-scope';
import { employeePayloadFromInput, parseEmployeeFormData } from './_lib/employee-form-data';

function linkSuccessMessage(alsoLinkedCount: number, mode: 'link' | 'invite' | 'email'): string {
  const suffix =
    alsoLinkedCount > 0
      ? ` További ${alsoLinkedCount} cég rekordja is összekötve ugyanazzal a fiókkal.`
      : '';
  if (mode === 'email') return `Fiók összekötve e-mail alapján.${suffix}`;
  if (mode === 'invite') return `Felhasználó létrehozva és összekötve.${suffix}`;
  return `Felhasználó összekötve.${suffix}`;
}

export async function createEmployeeAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  await requirePermission('hr:write');
  const { userId, permissions } = await getHrSessionScope();

  const parsed = employeeSchema.safeParse(parseEmployeeFormData(formData));
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  if (!mongoose.Types.ObjectId.isValid(parsed.data.companyId)) {
    return { success: false, message: 'Érvénytelen cég.' };
  }

  try {
    const payload = employeePayloadFromInput(parsed.data);
    const emp = await createEmployee(
      {
        ...payload,
        companyId: new mongoose.Types.ObjectId(parsed.data.companyId),
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

  const parsed = employeeSchema.safeParse(parseEmployeeFormData(formData));
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { success: false, message: 'Érvénytelen azonosító.' };
  }

  try {
    const payload = employeePayloadFromInput(parsed.data);
    await updateEmployee(
      new mongoose.Types.ObjectId(id),
      {
        ...payload,
        companyId: new mongoose.Types.ObjectId(parsed.data.companyId),
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

export async function searchUsersAction(q: string) {
  await requirePermission('hr:write');
  const parsed = searchUsersSchema.safeParse({ q });
  if (!parsed.success) return [];
  return searchUsersForHrLink(parsed.data.q);
}

export async function inviteEmployeeAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  await requirePermission('hr:write');
  const { userId, permissions } = await getHrSessionScope();

  const parsed = inviteEmployeeSchema.safeParse({
    employeeId: formData.get('employeeId'),
    password: formData.get('password') || undefined,
    mode: formData.get('mode') || 'password',
    linkUserId: formData.get('linkUserId') || undefined,
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  const employeeOid = new mongoose.Types.ObjectId(parsed.data.employeeId);

  try {
    if (parsed.data.mode === 'link_existing' && parsed.data.linkUserId) {
      await connectDB();
      const emp = await Employee.findById(employeeOid).exec();
      if (!emp) return { success: false, message: 'Dolgozó nem található.' };
      if (emp.userId) return { success: false, message: 'A dolgozó már rendelkezik fiókkal.' };

      const targetUserId = new mongoose.Types.ObjectId(parsed.data.linkUserId);
      const duplicate = await Employee.findOne({
        userId: targetUserId,
        companyId: emp.companyId,
      }).exec();
      if (duplicate) {
        return { success: false, message: 'A felhasználó már dolgozó ebben a cégben.' };
      }

      const { alsoLinkedCount } = await linkGuestEmployeeToExistingUser(
        employeeOid,
        targetUserId,
        userId,
        permissions
      );
      revalidatePath('/accounting/employees');
      revalidatePath(`/accounting/employees/${parsed.data.employeeId}`);
      return {
        success: true,
        message: linkSuccessMessage(alsoLinkedCount, 'link'),
      };
    } else if (parsed.data.mode === 'email_invite') {
      await connectDB();
      const emp = await Employee.findById(employeeOid).exec();
      if (!emp?.email) return { success: false, message: 'E-mail cím szükséges.' };

      const employeeRole = await Role.findOne({ key: 'employee' }).exec();
      await createAndSendInvitation({
        email: emp.email,
        name: emp.name,
        roleIds: employeeRole ? [employeeRole._id] : [],
        companyId: emp.companyId,
        isEmployee: true,
        employeeNumber: emp.employeeNumber,
        department: emp.department,
        phone: emp.phone,
        hrNotes: emp.hrNotes,
        invitedBy: userId,
      });
    } else {
      const { alsoLinkedCount } = await inviteEmployeeToUser(
        employeeOid,
        parsed.data.password!,
        userId,
        permissions
      );
      revalidatePath('/accounting/employees');
      revalidatePath(`/accounting/employees/${parsed.data.employeeId}`);
      return {
        success: true,
        message: linkSuccessMessage(alsoLinkedCount, 'invite'),
      };
    }

    revalidatePath('/accounting/employees');
    revalidatePath(`/accounting/employees/${parsed.data.employeeId}`);
    return {
      success: true,
      message: 'Meghívó elküldve.',
    };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Hiba történt.' };
  }
}

export async function linkEmployeeByEmailAction(employeeId: string): Promise<HrFormState> {
  await requirePermission('hr:write');
  const { userId, permissions } = await getHrSessionScope();

  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    return { success: false, message: 'Érvénytelen azonosító.' };
  }

  try {
    const { alsoLinkedCount } = await linkGuestEmployeeByEmailMatch(
      new mongoose.Types.ObjectId(employeeId),
      userId,
      permissions
    );
    revalidatePath('/accounting/employees');
    revalidatePath(`/accounting/employees/${employeeId}`);
    return { success: true, message: linkSuccessMessage(alsoLinkedCount, 'email') };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Hiba történt.' };
  }
}

export async function linkAllEmployeesByEmailAction(): Promise<HrFormState> {
  await requirePermission('hr:write');
  const { userId, permissions } = await getHrSessionScope();

  try {
    const result = await linkAllGuestEmployeesByEmailMatch(userId, permissions);
    revalidatePath('/accounting/employees');
    const parts = [`${result.linked} összekötve`];
    if (result.skipped > 0) parts.push(`${result.skipped} nem talált e-mail pár`);
    if (result.errors.length) parts.push(`${result.errors.length} hiba`);
    return {
      success: true,
      message: parts.join(', ') + '.',
    };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Hiba történt.' };
  }
}

export async function addEmployeeToCompanyAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  await requirePermission('hr:write');
  const { userId, permissions } = await getHrSessionScope();

  const parsed = addEmployeeToCompanySchema.safeParse({
    sourceEmployeeId: formData.get('sourceEmployeeId'),
    targetCompanyId: formData.get('targetCompanyId'),
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  if (
    !mongoose.Types.ObjectId.isValid(parsed.data.sourceEmployeeId) ||
    !mongoose.Types.ObjectId.isValid(parsed.data.targetCompanyId)
  ) {
    return { success: false, message: 'Érvénytelen azonosító.' };
  }

  try {
    const emp = await addEmployeeToAnotherCompany(
      new mongoose.Types.ObjectId(parsed.data.sourceEmployeeId),
      new mongoose.Types.ObjectId(parsed.data.targetCompanyId),
      userId,
      permissions
    );
    revalidatePath('/accounting/employees');
    revalidatePath('/accounting/schedule');
    revalidatePath('/accounting/leave-summary');
    return {
      success: true,
      message: 'Dolgozó hozzáadva a céghez.',
      id: emp._id.toString(),
    };
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

export async function deleteEmployeeAction(employeeId: string): Promise<HrFormState> {
  await requirePermission('hr:write');
  const { userId, permissions } = await getHrSessionScope();

  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    return { success: false, message: 'Érvénytelen azonosító.' };
  }

  try {
    await deleteEmployee(new mongoose.Types.ObjectId(employeeId), userId, permissions);
    revalidatePath('/accounting/employees');
    revalidatePath('/accounting/schedule');
    revalidatePath('/accounting/leave-summary');
    return { success: true, message: 'Dolgozói rekord törölve.' };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Hiba történt.' };
  }
}
