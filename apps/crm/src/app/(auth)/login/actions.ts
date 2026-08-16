'use server';

import { signIn } from '@crm/auth';
import { loginSchema } from '@crm/auth/validation';
import { AuthError } from 'next-auth';

export type LoginFormState =
  | { success: false; fieldErrors?: { email?: string[]; password?: string[] }; message?: string }
  | { success: true; message?: string };

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    const fieldErrors: { email?: string[]; password?: string[] } = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === 'email' || field === 'password') {
        fieldErrors[field] = [issue.message];
      }
    }
    return { success: false, fieldErrors, message: 'Please fix the errors below.' };
  }

  try {
    // Full server redirect so the session cookie is committed before navigation
    // (client-side router.replace misses cookies in Safari after server actions).
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: '/',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, message: 'Invalid email or password.' };
    }
    throw error;
  }

  return { success: true };
}
