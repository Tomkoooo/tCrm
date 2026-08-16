'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { requireAuth } from '@crm/auth';
import { connectDB, User } from '@crm/db-core';
import { changePasswordSchema, updateProfileSchema } from '@crm/auth/validation';

export type AccountFormState =
  | { success: false; fieldErrors?: Record<string, string[]>; message?: string }
  | { success: true; message?: string };

function zodToFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || 'form';
    fieldErrors[key] = fieldErrors[key] ?? [];
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}

export async function updateProfileAction(
  _prev: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const current = await requireAuth();
  if (!current) return { success: false, message: 'Nincs bejelentkezve.' };

  const parsed = updateProfileSchema.safeParse({
    name: formData.get('name'),
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  await connectDB();
  const user = await User.findById(current.id);
  if (!user) {
    return { success: false, message: 'Felhasználó nem található.' };
  }

  user.name = parsed.data.name;
  await user.save();

  revalidatePath('/account');
  return { success: true, message: 'Profil mentve.' };
}

export async function changePasswordAction(
  _prev: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const current = await requireAuth();
  if (!current) return { success: false, message: 'Nincs bejelentkezve.' };

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmNewPassword: formData.get('confirmNewPassword'),
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  await connectDB();
  const user = await User.findById(current.id);
  if (!user?.passwordHash) {
    return { success: false, message: 'Jelszó nem állítható be ehhez a fiókhoz.' };
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return { success: false, message: 'A jelenlegi jelszó helytelen.' };
  }

  user.passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await user.save();

  return { success: true, message: 'Jelszó megváltoztatva.' };
}

export async function getAccountData(userId: string) {
  await connectDB();

  const user = await User.findById(userId)
    .populate({
      path: 'roleIds',
      select: 'key name description',
    })
    .lean()
    .exec();

  if (!user) return null;

  const roles = (user.roleIds ?? []) as unknown as Array<{
    _id: { toString(): string };
    key: string;
    name: string;
    description?: string;
  }>;

  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    isActive: Boolean(user.isActive),
    roles: roles.map((r) => ({
      id: String(r._id),
      key: r.key,
      name: r.name,
      description: r.description,
    })),
    directPermissionKeys: user.directPermissionKeys ?? [],
  };
}
