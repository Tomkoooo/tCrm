'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { requireAuth, requirePermission } from '@crm/auth';
import {
  connectDB,
  Company,
  Employee,
  Permission,
  Role,
  User,
  getAdminRoleId,
  isLastActiveAdmin,
} from '@crm/db';
import {
  provisionUserWithEmployee,
  upsertEmployeeForUser,
  removeEmployeeLinkForUser,
} from '@crm/core';
import {
  createUserSchema,
  updateUserSchema,
  parseLinkEmployeeFromForm,
  employeeProfileFromForm,
} from '@crm/lib/validation';

export type UserFormState =
  | { success: false; fieldErrors?: Record<string, string[]>; message?: string }
  | { success: true; message?: string; id?: string };

function zodToFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || 'form';
    fieldErrors[key] = fieldErrors[key] ?? [];
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}

function parseUserFormData(formData: FormData, includePassword: boolean) {
  const roleIds = formData.getAll('roleIds').map(String).filter(Boolean);
  const directPermissionKeys = formData.getAll('directPermissionKeys').map(String).filter(Boolean);

  const base = {
    name: formData.get('name'),
    email: formData.get('email'),
    isActive: formData.get('isActive') === 'on' || formData.get('isActive') === 'true',
    roleIds,
    directPermissionKeys,
  };

  if (includePassword) {
    return { ...base, password: formData.get('password') };
  }

  return { ...base, password: formData.get('password') ?? '' };
}

async function validateRoleIds(roleIds: string[]): Promise<string | null> {
  if (roleIds.length === 0) return null;
  const validIds = roleIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (validIds.length !== roleIds.length) {
    return 'Érvénytelen szerepkör azonosító.';
  }
  const count = await Role.countDocuments({ _id: { $in: validIds } }).exec();
  if (count !== roleIds.length) {
    return 'Egy vagy több szerepkör nem található.';
  }
  return null;
}

async function assertNotRemovingLastAdmin(
  userId: string,
  nextIsActive: boolean,
  nextRoleIds: string[]
): Promise<string | null> {
  const adminRoleId = await getAdminRoleId();
  if (!adminRoleId) return null;

  const wasLastAdmin = await isLastActiveAdmin(userId);
  if (!wasLastAdmin) return null;

  const keepsAdminRole = nextRoleIds.includes(adminRoleId);
  if (!nextIsActive || !keepsAdminRole) {
    return 'Az utolsó aktív adminisztrátort nem lehet inaktiválni vagy admin szerepkörétől megfosztani.';
  }

  return null;
}

export async function createUserAction(
  _prev: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  await requirePermission('users:write');
  await connectDB();

  const parsed = createUserSchema.safeParse(parseUserFormData(formData, true));
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  const roleError = await validateRoleIds(parsed.data.roleIds);
  if (roleError) return { success: false, message: roleError };

  const email = parsed.data.email.toLowerCase();
  const existing = await User.findOne({ email }).exec();
  if (existing) {
    return { success: false, message: 'Ez az e-mail cím már foglalt.' };
  }

  const companyIdRaw = String(formData.get('companyId') ?? '').trim();
  const linkEmployee = parseLinkEmployeeFromForm(formData) || Boolean(companyIdRaw);
  const profile = employeeProfileFromForm(formData, linkEmployee);

  try {
    const roleIds = parsed.data.roleIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const { user } = await provisionUserWithEmployee({
      name: parsed.data.name,
      email,
      password: parsed.data.password,
      roleIds,
      directPermissionKeys: parsed.data.directPermissionKeys,
      isActive: parsed.data.isActive,
      skipCompanyScope: true,
      employee: profile?.companyId
        ? {
            companyId: new mongoose.Types.ObjectId(profile.companyId),
            employeeNumber: profile.employeeNumber,
            department: profile.department,
            phone: profile.phone,
            hrNotes: profile.hrNotes,
          }
        : undefined,
    });

    revalidatePath('/admin/users');
    revalidatePath('/accounting/employees');
    return {
      success: true,
      message: profile?.companyId
        ? 'Felhasználó és dolgozói profil létrehozva.'
        : 'Felhasználó létrehozva.',
      id: user._id.toString(),
    };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Hiba történt.' };
  }
}

export async function updateUserAction(
  userId: string,
  _prev: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  await requirePermission('users:write');
  const current = await requireAuth();
  if (!current) return { success: false, message: 'Nincs bejelentkezve.' };
  await connectDB();

  const parsed = updateUserSchema.safeParse(parseUserFormData(formData, false));
  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  const roleError = await validateRoleIds(parsed.data.roleIds);
  if (roleError) return { success: false, message: roleError };

  const user = await User.findById(userId);
  if (!user) {
    return { success: false, message: 'Felhasználó nem található.' };
  }

  if (userId === current.id && !parsed.data.isActive) {
    return { success: false, message: 'Saját fiókot nem lehet inaktiválni.' };
  }

  const adminGuard = await assertNotRemovingLastAdmin(
    userId,
    parsed.data.isActive,
    parsed.data.roleIds
  );
  if (adminGuard) return { success: false, message: adminGuard };

  const email = parsed.data.email.toLowerCase();
  if (email !== user.email) {
    const dup = await User.findOne({ email, _id: { $ne: userId } }).exec();
    if (dup) {
      return { success: false, message: 'Ez az e-mail cím már foglalt.' };
    }
    user.email = email;
  }

  user.name = parsed.data.name;
  user.isActive = parsed.data.isActive;
  user.roleIds = parsed.data.roleIds as unknown as typeof user.roleIds;
  user.directPermissionKeys = parsed.data.directPermissionKeys;

  if (parsed.data.password && parsed.data.password.length > 0) {
    user.passwordHash = await bcrypt.hash(parsed.data.password, 10);
  }

  await user.save();

  const companyIdRaw = String(formData.get('companyId') ?? '').trim();
  const linkEmployee = parseLinkEmployeeFromForm(formData) || Boolean(companyIdRaw);
  const profile = employeeProfileFromForm(formData, linkEmployee);
  const unlink = formData.get('unlinkEmployee') === 'on';

  try {
    if (unlink) {
      await removeEmployeeLinkForUser(user._id);
    } else if (profile?.companyId) {
      if (!mongoose.Types.ObjectId.isValid(profile.companyId)) {
        return { success: false, message: 'Érvénytelen cég.' };
      }
      await upsertEmployeeForUser(
        user._id,
        {
          name: user.name,
          email: user.email,
          companyId: new mongoose.Types.ObjectId(profile.companyId),
          employeeNumber: profile.employeeNumber,
          department: profile.department,
          phone: profile.phone,
          hrNotes: profile.hrNotes,
          isActive: user.isActive,
        },
        { skipCompanyScope: true }
      );
    }
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Dolgozói profil hiba.' };
  }

  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath('/accounting/employees');
  return { success: true, message: 'Felhasználó mentve.' };
}

export async function getUsersEditorData() {
  await requirePermission('users:write');
  await connectDB();

  const [roles, permissions, companies] = await Promise.all([
    Role.find().sort({ name: 1 }).lean().exec(),
    Permission.find().sort({ group: 1, key: 1 }).lean().exec(),
    Company.find({ isActive: true }).sort({ name: 1 }).lean().exec(),
  ]);

  return {
    companies: companies.map((c) => ({ _id: String(c._id), name: c.name })),
    roles: roles.map((r) => ({
      id: String(r._id),
      key: r.key,
      name: r.name,
      description: r.description,
      isSystem: Boolean(r.isSystem),
    })),
    permissions: permissions.map((p) => ({
      key: p.key,
      label: p.label,
      group: p.group,
    })),
  };
}

export async function getUserForEdit(userId: string) {
  await requirePermission('users:write');
  await connectDB();

  const user = await User.findById(userId).lean().exec();
  if (!user) return null;

  const lastAdmin = await isLastActiveAdmin(userId);
  const employee = await Employee.findOne({ userId: user._id }).lean().exec();

  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    isActive: Boolean(user.isActive),
    roleIds: (user.roleIds ?? []).map((id) => String(id)),
    directPermissionKeys: user.directPermissionKeys ?? [],
    isLastActiveAdmin: lastAdmin,
    employee: employee
      ? {
          _id: String(employee._id),
          companyId: String(employee.companyId),
          employeeNumber: employee.employeeNumber,
          department: employee.department,
          phone: employee.phone,
          hrNotes: employee.hrNotes,
        }
      : undefined,
  };
}
