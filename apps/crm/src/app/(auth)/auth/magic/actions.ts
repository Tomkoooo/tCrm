'use server';

import { signIn } from '@crm/auth';
import { sanitizeMagicRedirect } from '@crm/auth/magic-link';
import { AuthError } from 'next-auth';

export type MagicLinkState = { success: false; message: string };

/**
 * Exchanges an e-mail magic token for a session.
 *
 * `signIn` with a `redirectTo` performs a full server redirect so the session
 * cookie is committed before navigation (the same reason `loginAction` does).
 */
export async function magicSignInAction(
  _prev: MagicLinkState,
  formData: FormData
): Promise<MagicLinkState> {
  const token = String(formData.get('token') ?? '').trim();
  const redirectTo = sanitizeMagicRedirect(String(formData.get('redirectTo') ?? '')) ?? '/hr/me';

  if (!token) {
    return { success: false, message: 'Hiányzó belépési kód.' };
  }

  try {
    await signIn('magic-link', { token, redirectTo });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        success: false,
        message:
          'Ez a belépési link már nem érvényes (lejárt vagy visszavonták). Jelentkezz be a szokásos módon.',
      };
    }
    throw error;
  }

  return { success: false, message: 'Váratlan hiba a belépésnél.' };
}
