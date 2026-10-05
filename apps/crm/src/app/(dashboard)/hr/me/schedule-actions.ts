'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@crm/auth';
import {
  cancelScheduleChangeRequest,
  notifyScheduleChangeRequested,
  submitScheduleChangeRequest,
} from '@crm/hr';
import { parseHrDateTime } from '@crm/lib';
import { scheduleChangeRequestSchema } from '@crm/lib/validation';

export type ScheduleRequestResult =
  | { success: false; message: string }
  | { success: true; message: string; notified: boolean };

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/**
 * An employee asks for their own shift to be moved. Ownership is enforced inside
 * `submitScheduleChangeRequest` (the request must target the caller's own shift).
 */
export async function requestScheduleChangeAction(input: {
  scheduleEntryId: string;
  proposedStart: string;
  proposedEnd: string;
  note?: string;
}): Promise<ScheduleRequestResult> {
  const user = await getCurrentUser();
  if (!user?.id) return { success: false, message: 'Nincs bejelentkezve.' };

  const parsed = scheduleChangeRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Érvénytelen kérés.' };
  }

  let proposedStart: Date;
  let proposedEnd: Date;
  try {
    // Budapest wall-clock, matching the `datetime-local` inputs the form renders.
    proposedStart = parseHrDateTime(parsed.data.proposedStart);
    proposedEnd = parseHrDateTime(parsed.data.proposedEnd);
  } catch (err) {
    return { success: false, message: errorMessage(err, 'Érvénytelen időpont.') };
  }

  try {
    const request = await submitScheduleChangeRequest({
      scheduleEntryId: parsed.data.scheduleEntryId,
      proposedStart,
      proposedEnd,
      note: parsed.data.note,
      requestedBy: user.id,
    });

    // The request is recorded even if the notification fails; say which happened.
    const mail = await notifyScheduleChangeRequested(request);

    revalidatePath('/hr/me');
    revalidatePath('/hr/schedules');

    return {
      success: true,
      notified: mail.sent,
      message: mail.sent
        ? 'Kérelem elküldve, a beosztás készítője értesítést kapott.'
        : `Kérelem rögzítve, de az értesítő e-mail nem ment ki (${mail.reason ?? 'ismeretlen ok'}). Szólj a HR-nek.`,
    };
  } catch (err) {
    return { success: false, message: errorMessage(err, 'A kérelem beadása sikertelen.') };
  }
}

export async function cancelScheduleChangeAction(
  id: string
): Promise<{ success: boolean; message: string }> {
  const user = await getCurrentUser();
  if (!user?.id) return { success: false, message: 'Nincs bejelentkezve.' };

  try {
    await cancelScheduleChangeRequest(id, user.id);
    revalidatePath('/hr/me');
    revalidatePath('/hr/schedules');
    return { success: true, message: 'Kérelem visszavonva.' };
  } catch (err) {
    return { success: false, message: errorMessage(err, 'A visszavonás sikertelen.') };
  }
}
