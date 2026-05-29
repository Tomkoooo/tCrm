import { notFound } from 'next/navigation';
import mongoose from 'mongoose';
import { requirePermission } from '@crm/auth';
import { connectDB, Company } from '@crm/db';
import { Container } from '@crm/ui';
import { getHrSessionScope } from '@/lib/hr/session-scope';
import { assertCompanyInScope } from '@crm/core';
import { EditCompanyForm } from '../_components/company-form';

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('hr:write');
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  const { userId, permissions } = await getHrSessionScope();
  await connectDB();

  try {
    await assertCompanyInScope(new mongoose.Types.ObjectId(id), userId, permissions);
  } catch {
    notFound();
  }

  const company = await Company.findById(id).lean().exec();
  if (!company) notFound();

  const allCompanies = await Company.find({ isActive: true }).sort({ name: 1 }).lean().exec();
  const parentOptions = allCompanies.map((c) => ({
    _id: String(c._id),
    name: c.name,
  }));

  return (
    <Container className="flex max-w-lg flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">{company.name}</h1>
        <p className="text-muted-foreground text-sm">{company.slug}</p>
      </div>
      <EditCompanyForm
        company={{
          _id: String(company._id),
          name: company.name,
          slug: company.slug,
          parentCompanyId: company.parentCompanyId ? String(company.parentCompanyId) : undefined,
          isActive: company.isActive,
        }}
        parentCompanies={parentOptions}
      />
    </Container>
  );
}
