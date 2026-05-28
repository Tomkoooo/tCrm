'use server';

import bcrypt from 'bcryptjs';
import { connectDB, ensureBaselineRbac, hasAnyAdminUser, Role, User } from '@crm/db';
import { isPublicRegistrationEnabled } from '@crm/lib';
import { registerSchema } from '@crm/lib/validation';

export type RegisterFormState =
  | {
      success: false;
      fieldErrors?: Record<string, string[]>;
      message?: string;
    }
  | { success: true; message?: string };

export async function registerAction(
  _prevState: RegisterFormState,
  formData: FormData
): Promise<RegisterFormState> {
  if (!isPublicRegistrationEnabled()) {
    return {
      success: false,
      message: 'Registration is disabled. Please contact an administrator.',
    };
  }

  await connectDB();
  if (!(await hasAnyAdminUser())) {
    return {
      success: false,
      message: 'Complete initial setup before registering.',
    };
  }

  await ensureBaselineRbac();

  const parsed = registerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]);
      fieldErrors[field] = fieldErrors[field] ?? [];
      fieldErrors[field].push(issue.message);
    }
    return { success: false, fieldErrors, message: 'Please fix the errors below.' };
  }

  const existing = await User.findOne({ email: parsed.data.email.toLowerCase() });
  if (existing) {
    return { success: false, message: 'An account with this email already exists.' };
  }

  const viewerRole = await Role.findOne({ key: 'viewer' });
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await User.create({
    email: parsed.data.email.toLowerCase(),
    name: parsed.data.name,
    passwordHash,
    roleIds: viewerRole ? [viewerRole._id] : [],
    directPermissionKeys: [],
    isActive: true,
  });

  return { success: true, message: 'Account created. You can now sign in.' };
}
