import { connectDB, Company, Employee, getBranding, type ICompany } from '@crm/db-core';
import type { Types } from 'mongoose';
import mongoose from 'mongoose';

function toOid(id: Types.ObjectId | string): Types.ObjectId {
  return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
}

export function slugifyCompanyName(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120) || 'company'
  );
}

/** Ensure at least one company exists; backfill employees missing companyId. */
export async function ensureDefaultCompany(): Promise<ICompany> {
  await connectDB();
  let company = await Company.findOne({ isActive: true }).sort({ createdAt: 1 }).exec();
  if (!company) {
    const branding = await getBranding().catch(() => null);
    const name = branding?.companyName?.trim() || 'Holding';
    let slug = slugifyCompanyName(name);
    const clash = await Company.findOne({ slug }).lean().exec();
    if (clash) slug = `${slug}-${Date.now().toString(36)}`;
    company = await Company.create({ name, slug, isActive: true });
  }

  await Employee.updateMany(
    { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
    { $set: { companyId: company._id, scheduleMode: 'logistics' } }
  ).exec();

  return company;
}

export async function listCompanies(options?: { activeOnly?: boolean }): Promise<ICompany[]> {
  await connectDB();
  await ensureDefaultCompany();
  const filter: Record<string, unknown> = {};
  if (options?.activeOnly !== false) filter.isActive = true;
  return Company.find(filter).sort({ name: 1 }).exec();
}

export async function getCompanyById(id: Types.ObjectId | string): Promise<ICompany | null> {
  await connectDB();
  return Company.findById(toOid(id)).exec();
}

export async function createCompany(params: {
  name: string;
  slug?: string;
  isActive?: boolean;
  notes?: string;
}): Promise<ICompany> {
  await connectDB();
  const slug = params.slug?.trim() || slugifyCompanyName(params.name);
  const existing = await Company.findOne({ slug }).lean().exec();
  if (existing) throw new Error('Ez a slug már foglalt.');
  return Company.create({
    name: params.name.trim(),
    slug,
    isActive: params.isActive ?? true,
    notes: params.notes?.trim() || undefined,
  });
}

export async function updateCompany(
  id: Types.ObjectId | string,
  params: { name?: string; slug?: string; isActive?: boolean; notes?: string }
): Promise<ICompany> {
  await connectDB();
  const company = await Company.findById(toOid(id));
  if (!company) throw new Error('Cég nem található.');
  if (params.name !== undefined) company.name = params.name.trim();
  if (params.slug !== undefined) {
    const slug = params.slug.trim().toLowerCase();
    const clash = await Company.findOne({ slug, _id: { $ne: company._id } })
      .lean()
      .exec();
    if (clash) throw new Error('Ez a slug már foglalt.');
    company.slug = slug;
  }
  if (params.isActive !== undefined) company.isActive = params.isActive;
  if (params.notes !== undefined) company.notes = params.notes.trim() || undefined;
  await company.save();
  return company;
}
