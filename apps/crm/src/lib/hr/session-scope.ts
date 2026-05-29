import { requireAuth } from '@crm/auth';
import { resolveAllowedCompanyIds } from '@crm/core';
import mongoose from 'mongoose';

export async function getHrSessionScope() {
  const user = await requireAuth();
  if (!user) throw new Error('Unauthorized');
  const userId = new mongoose.Types.ObjectId(user.id);
  const permissions = user.permissions ?? [];
  const allowedCompanyIds = await resolveAllowedCompanyIds(userId, permissions);
  return { user, userId, permissions, allowedCompanyIds };
}
