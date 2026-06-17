import { notFound } from 'next/navigation';
import mongoose from 'mongoose';
import { requireAnyPermission } from '@crm/auth';
import { connectDB, Team } from '@crm/db';
import { assertCompanyInScope, listActiveCompanies } from '@crm/core';
import { Container } from '@crm/ui';
import { getHrSessionScope } from '@/lib/hr/session-scope';
import { EditTeamForm } from '../_components/edit-team-form';

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAnyPermission(['hr:write', 'hr:teams:write']);
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  const { userId, permissions, allowedCompanyIds } = await getHrSessionScope();
  await connectDB();

  const team = await Team.findById(id).lean().exec();
  if (!team) notFound();

  try {
    await assertCompanyInScope(team.companyId as mongoose.Types.ObjectId, userId, permissions);
  } catch {
    notFound();
  }

  const companies = await listActiveCompanies(allowedCompanyIds);

  return (
    <Container className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{team.name}</h1>
        <p className="text-muted-foreground text-sm">Csapat szerkesztése — slug: {team.slug}</p>
      </div>
      <EditTeamForm
        teamId={id}
        companies={companies.map((c) => ({ _id: String(c._id), name: c.name }))}
        initial={{
          name: team.name,
          slug: team.slug,
          companyId: String(team.companyId),
          leaderEmployeeId: String(team.leaderEmployeeId),
          memberEmployeeIds: team.memberEmployeeIds.map(String),
          teamType: team.teamType,
          isActive: team.isActive,
        }}
      />
    </Container>
  );
}
