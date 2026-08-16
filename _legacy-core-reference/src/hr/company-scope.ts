import { connectDB, Company, HrCompanyScope, type ICompany } from '@crm/db';
import type { Types } from 'mongoose';

export function hasGlobalHrScope(permissions: string[]): boolean {
  return permissions.includes('hr:scope_all') || permissions.includes('admin:access');
}

export async function getCompanyIdsForUser(userId: Types.ObjectId): Promise<Types.ObjectId[]> {
  await connectDB();
  const scope = await HrCompanyScope.findOne({ userId }).lean().exec();
  if (!scope?.companyIds?.length) return [];
  return scope.companyIds as Types.ObjectId[];
}

export async function resolveAllowedCompanyIds(
  userId: Types.ObjectId,
  permissions: string[]
): Promise<Types.ObjectId[] | null> {
  if (hasGlobalHrScope(permissions)) return null;
  return getCompanyIdsForUser(userId);
}

export function buildCompanyFilter(
  allowedCompanyIds: Types.ObjectId[] | null
): Record<string, unknown> {
  if (allowedCompanyIds === null) return {};
  if (!allowedCompanyIds.length) {
    return { _id: { $exists: false } };
  }
  return { companyId: { $in: allowedCompanyIds } };
}

export function buildCompanyIdFilter(
  allowedCompanyIds: Types.ObjectId[] | null
): Record<string, unknown> {
  if (allowedCompanyIds === null) return {};
  if (!allowedCompanyIds.length) {
    return { _id: { $exists: false } };
  }
  return { _id: { $in: allowedCompanyIds } };
}

export async function assertCompanyInScope(
  companyId: Types.ObjectId,
  userId: Types.ObjectId,
  permissions: string[]
): Promise<void> {
  const allowed = await resolveAllowedCompanyIds(userId, permissions);
  if (allowed === null) return;
  if (!allowed.some((id) => id.equals(companyId))) {
    throw new Error('Nincs jogosultság ehhez a céghez.');
  }
}

export async function listActiveCompanies(
  allowedCompanyIds: Types.ObjectId[] | null
): Promise<ICompany[]> {
  await connectDB();
  const filter = buildCompanyIdFilter(allowedCompanyIds);
  filter.isActive = true;
  return Company.find(filter).sort({ name: 1 }).exec();
}

export async function setHrCompanyScope(
  userId: Types.ObjectId,
  companyIds: Types.ObjectId[]
): Promise<void> {
  await connectDB();
  await HrCompanyScope.findOneAndUpdate(
    { userId },
    { userId, companyIds },
    { upsert: true, new: true }
  ).exec();
}
