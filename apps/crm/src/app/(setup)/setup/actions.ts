'use server';

import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { connectDB, hasAnyAdminUser, Role, User } from '@crm/db-core';
import { registerSchema } from '@crm/auth/validation';
import { seedEngineMailTemplates } from '@crm/admin';
import { ensureRbacBootstrapped } from '@/lib/rbac-bootstrap';
import { setInitializedCookie } from '@/lib/initialized-cookie';

export type SetupState =
  | { success: false; fieldErrors?: Record<string, string[]>; message?: string }
  | { success: true; message?: string };

export async function setupAdminAction(_prev: SetupState, formData: FormData): Promise<SetupState> {
  const parsed = registerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? 'form');
      fieldErrors[field] = fieldErrors[field] ?? [];
      fieldErrors[field].push(issue.message);
    }
    return { success: false, fieldErrors, message: 'Please fix the errors below.' };
  }

  await connectDB();
  if (await hasAnyAdminUser()) {
    redirect('/setup/complete');
  }

  await ensureRbacBootstrapped();
  await seedEngineMailTemplates();

  const email = parsed.data.email.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    return { success: false, message: 'An account with this email already exists.' };
  }

  const adminRole = await Role.findOne({ key: 'admin' });
  if (!adminRole) {
    return {
      success: false,
      message: 'Could not create the admin role. Check database connectivity and try again.',
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await User.create({
    email,
    name: parsed.data.name,
    passwordHash,
    roleIds: [adminRole._id],
    directPermissionKeys: [],
    isActive: true,
  });

  await setInitializedCookie();
  redirect('/login');
}
