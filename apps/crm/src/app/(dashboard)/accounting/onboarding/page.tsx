import { redirect } from 'next/navigation';
import { requireAuth } from '@crm/auth';
import { connectDB, Company } from '@crm/db';
import { listEmployeesForUser, userNeedsEmployeeOnboarding } from '@crm/core';
import { Container } from '@crm/ui';
import mongoose from 'mongoose';
import { OnboardingClient } from './_components/onboarding-client';

export default async function EmployeeOnboardingPage() {
  const user = await requireAuth();
  if (!user) redirect('/login');

  await connectDB();
  const userId = new mongoose.Types.ObjectId(user.id);
  const needs = await userNeedsEmployeeOnboarding(userId);
  if (!needs) redirect('/accounting/my');

  const employees = await listEmployeesForUser(userId);
  const companyIds = [...new Set(employees.map((e) => e.companyId.toString()))];
  const companies = await Company.find({ _id: { $in: companyIds } })
    .select({ name: 1 })
    .lean()
    .exec();
  const companyMap = new Map(companies.map((c) => [c._id.toString(), c.name]));

  const rows = employees.map((e) => ({
    _id: e._id.toString(),
    name: e.name,
    companyId: e.companyId.toString(),
    companyName: companyMap.get(e.companyId.toString()) ?? '—',
    employeeNumber: e.employeeNumber ?? '',
    department: e.department ?? '',
    phone: e.phone ?? '',
    hrNotes: e.hrNotes ?? '',
  }));

  return (
    <Container className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Dolgozói profil beállítása</h1>
        <p className="text-muted-foreground text-sm">
          Töltse ki adatait a beosztás és szabadság igényléshez. A meghívóban megadott cég már hozzá
          van rendelve.
        </p>
      </div>
      <OnboardingClient employees={rows} />
    </Container>
  );
}
