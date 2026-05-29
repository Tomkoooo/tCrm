import { requireAuth } from '@crm/auth';
import { getEmployeeByUserId } from '@crm/core';
import type { IEmployee } from '@crm/db';
import mongoose from 'mongoose';

/** Authenticated user with an active Employee profile linked by userId. */
export async function getLinkedEmployeeForSession(): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof requireAuth>>>;
  userId: mongoose.Types.ObjectId;
  employee: IEmployee;
}> {
  const user = await requireAuth();
  if (!user) throw new Error('Unauthorized');

  const userId = new mongoose.Types.ObjectId(user.id);
  const employee = await getEmployeeByUserId(userId);
  if (!employee) {
    throw new Error('NO_LINKED_EMPLOYEE');
  }

  return { user, userId, employee };
}
