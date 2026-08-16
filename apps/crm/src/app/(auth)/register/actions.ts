'use server';

import { connectDB, hasAnyAdminUser, Role } from '@crm/db-core';
import { registerSchema } from '@crm/auth/validation';
import { createUser } from '@crm/admin';
import { isPublicRegistrationEnabled } from '@crm/lib';

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
      message: 'A regisztráció le van tiltva. Forduljon az adminisztrátorhoz.',
    };
  }

  await connectDB();
  if (!(await hasAnyAdminUser())) {
    return {
      success: false,
      message: 'Előbb fejezze be a kezdeti telepítést.',
    };
  }

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
    return { success: false, fieldErrors, message: 'Javítsa a hibákat.' };
  }

  try {
    const viewerRole = await Role.findOne({ key: 'viewer' }).exec();
    const roleIds = viewerRole ? [viewerRole._id] : [];

    await createUser({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      roleIds,
    });

    return { success: true, message: 'Fiók létrehozva. Bejelentkezhet.' };
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : 'Regisztráció sikertelen.',
    };
  }
}
