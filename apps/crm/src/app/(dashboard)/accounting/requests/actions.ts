'use server';

import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import { requirePermission, requireAnyPermission } from '@crm/auth';
import { reviewHrRequest } from '@crm/core';
import { HR_READ_PERMISSION_KEYS, HR_APPROVE_PERMISSION_KEYS } from '@crm/lib';
import type { HrFormState } from '../_components/form-utils';
import { getHrSessionScope } from '@/lib/hr/session-scope';

export async function approveRequestAction(
  requestId: string,
  reviewNote?: string
): Promise<HrFormState> {
  await requireAnyPermission([...HR_APPROVE_PERMISSION_KEYS]);
  const { userId, permissions } = await getHrSessionScope();

  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    return { success: false, message: 'Érvénytelen azonosító.' };
  }

  try {
    await reviewHrRequest(
      new mongoose.Types.ObjectId(requestId),
      true,
      userId,
      permissions,
      reviewNote
    );
    revalidatePath('/accounting/requests');
    return { success: true, message: 'Kérelem jóváhagyva.' };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Hiba történt.' };
  }
}

export async function rejectRequestAction(
  requestId: string,
  reviewNote?: string
): Promise<HrFormState> {
  await requireAnyPermission([...HR_APPROVE_PERMISSION_KEYS]);
  const { userId, permissions } = await getHrSessionScope();

  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    return { success: false, message: 'Érvénytelen azonosító.' };
  }

  try {
    await reviewHrRequest(
      new mongoose.Types.ObjectId(requestId),
      false,
      userId,
      permissions,
      reviewNote
    );
    revalidatePath('/accounting/requests');
    return { success: true, message: 'Kérelem elutasítva.' };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Hiba történt.' };
  }
}

export async function listRequestsGuard() {
  await requireAnyPermission([...HR_READ_PERMISSION_KEYS]);
}
