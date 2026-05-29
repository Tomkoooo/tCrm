import { connectDB, Company, type ICompany } from '@crm/db';
import type { Types } from 'mongoose';
import { assertCompanyInScope } from './company-scope';

export async function createCompany(data: {
  name: string;
  slug: string;
  parentCompanyId?: Types.ObjectId;
  isActive: boolean;
}): Promise<ICompany> {
  await connectDB();
  return Company.create(data);
}

export async function updateCompany(
  id: Types.ObjectId,
  data: Partial<{
    name: string;
    slug: string;
    parentCompanyId?: Types.ObjectId | null;
    isActive: boolean;
  }>,
  actorUserId: Types.ObjectId,
  permissions: string[]
): Promise<ICompany> {
  await connectDB();
  await assertCompanyInScope(id, actorUserId, permissions);
  const company = await Company.findById(id).exec();
  if (!company) throw new Error('Cég nem található.');
  if (data.parentCompanyId !== undefined) {
    company.parentCompanyId = data.parentCompanyId ?? undefined;
  }
  if (data.name !== undefined) company.name = data.name;
  if (data.slug !== undefined) company.slug = data.slug;
  if (data.isActive !== undefined) company.isActive = data.isActive;
  await company.save();
  return company;
}

export async function getCompanyById(id: Types.ObjectId): Promise<ICompany | null> {
  await connectDB();
  return Company.findById(id).exec();
}
