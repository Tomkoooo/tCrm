'use server';

import bcrypt from 'bcryptjs';
import { completePasswordReset } from '@crm/core';
import { resetPasswordSchema } from '@crm/lib/validation';

export type ResetPasswordFormState =
  | { success: false; fieldErrors?: Record<string, string[]>; message?: string }
  | { success: true; message?: string };

export async function resetPasswordAction(
  _prev: ResetPasswordFormState,
  formData: FormData
): Promise<ResetPasswordFormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get('token'),
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
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    await completePasswordReset(parsed.data.token, passwordHash);
    return { success: true, message: 'Jelszó frissítve. Bejelentkezhet.' };
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : 'Visszaállítás sikertelen.',
    };
  }
}
