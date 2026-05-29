'use server';

import mongoose from 'mongoose';
import { connectDB, ensureBaselineRbac, hasAnyAdminUser, Role } from '@crm/db';
import { provisionUserWithEmployee } from '@crm/core';
import { isPublicRegistrationEnabled } from '@crm/lib';
import {
  registerSchema,
  parseLinkEmployeeFromForm,
  employeeProfileFromForm,
} from '@crm/lib/validation';

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
    return { success: false, fieldErrors, message: 'Javítsa a hibákat.' };
  }

  const linkEmployee = parseLinkEmployeeFromForm(formData);
  const profile = employeeProfileFromForm(formData, linkEmployee);

  if (linkEmployee && !profile?.companyId) {
    return { success: false, message: 'Dolgozóként regisztráláshoz válasszon céget.' };
  }

  if (profile?.companyId && !mongoose.Types.ObjectId.isValid(profile.companyId)) {
    return { success: false, message: 'Érvénytelen cég.' };
  }

  try {
    const viewerRole = await Role.findOne({ key: 'viewer' }).exec();
    const roleIds = viewerRole ? [viewerRole._id] : [];

    await provisionUserWithEmployee({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      roleIds,
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

    return {
      success: true,
      message: profile?.companyId
        ? 'Fiók és dolgozói profil létrehozva. Bejelentkezhet.'
        : 'Fiók létrehozva. Bejelentkezhet.',
    };
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : 'Regisztráció sikertelen.',
    };
  }
}
