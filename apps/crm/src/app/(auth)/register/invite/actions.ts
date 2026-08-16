'use server';

import { acceptInvitation } from '@crm/admin';
import { inviteAcceptSchema } from '@crm/admin/validation';

export type InviteAcceptFormState =
  | { success: false; fieldErrors?: Record<string, string[]>; message?: string }
  | {
      success: true;
      email: string;
      message?: string;
    };

export async function acceptInviteAction(
  _prev: InviteAcceptFormState,
  formData: FormData
): Promise<InviteAcceptFormState> {
  const parsed = inviteAcceptSchema.safeParse({
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
    const result = await acceptInvitation(parsed.data.token, parsed.data.password);
    return {
      success: true,
      email: result.email,
      message: 'Fiók létrehozva. Bejelentkezés…',
    };
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : 'Regisztráció sikertelen.',
    };
  }
}
