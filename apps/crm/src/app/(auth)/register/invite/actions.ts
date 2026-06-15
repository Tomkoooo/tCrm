'use server';

import { requireAuth } from '@crm/auth';
import { acceptCompanyJoinForLoggedInUser, acceptInvitation } from '@crm/core';
import { inviteAcceptSchema } from '@crm/lib/validation';
import mongoose from 'mongoose';
import { z } from '@crm/lib';

export type InviteAcceptFormState =
  | { success: false; fieldErrors?: Record<string, string[]>; message?: string }
  | {
      success: true;
      email: string;
      message?: string;
      redirectTo?: string;
      needsSignIn?: boolean;
    };

const companyJoinLoggedInSchema = z.object({
  token: z.string().min(1),
});

export async function acceptInviteAction(
  _prev: InviteAcceptFormState,
  formData: FormData
): Promise<InviteAcceptFormState> {
  const mode = formData.get('mode');
  if (mode === 'company_join_logged_in') {
    const user = await requireAuth();
    if (!user) return { success: false, message: 'Bejelentkezés szükséges.' };

    const parsed = companyJoinLoggedInSchema.safeParse({ token: formData.get('token') });
    if (!parsed.success) {
      return { success: false, message: 'Érvénytelen meghívó.' };
    }

    try {
      const userId = new mongoose.Types.ObjectId(user.id);
      await acceptCompanyJoinForLoggedInUser(parsed.data.token, userId);
      return {
        success: true,
        email: user.email ?? '',
        message: 'Céghez csatlakozás sikeres.',
        redirectTo: '/accounting/onboarding',
      };
    } catch (e) {
      return {
        success: false,
        message: e instanceof Error ? e.message : 'Csatlakozás sikertelen.',
      };
    }
  }

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
    const redirectTo =
      result.needsOnboarding && result.kind === 'new_user'
        ? '/accounting/onboarding'
        : result.needsOnboarding
          ? '/accounting/onboarding'
          : '/';

    return {
      success: true,
      email: result.email,
      message:
        result.kind === 'company_join' ? 'Csatlakozás sikeres.' : 'Fiók létrehozva. Bejelentkezés…',
      redirectTo,
      needsSignIn: result.kind === 'new_user',
    };
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : 'Regisztráció sikertelen.',
    };
  }
}
