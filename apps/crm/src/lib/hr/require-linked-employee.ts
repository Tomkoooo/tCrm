import { requireAuth } from '@crm/auth';
import { getActiveEmployeeOrThrow } from '@/lib/hr/active-employee';
import type { IEmployee } from '@crm/db';
import mongoose from 'mongoose';

/** Authenticated user with an active Employee profile (supports multi-company). */
export async function getLinkedEmployeeForSession(options?: {
  employeeId?: string | null;
}): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof requireAuth>>>;
  userId: mongoose.Types.ObjectId;
  employee: IEmployee;
}> {
  const user = await requireAuth();
  if (!user) throw new Error('Unauthorized');

  const userId = new mongoose.Types.ObjectId(user.id);
  const employee = await getActiveEmployeeOrThrow(userId, options?.employeeId);
  return { user, userId, employee };
}
