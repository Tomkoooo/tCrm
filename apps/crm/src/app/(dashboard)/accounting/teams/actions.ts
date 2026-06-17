'use server';

import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import { requireAnyPermission } from '@crm/auth';
import { createTeam, updateTeam } from '@crm/core';
import { connectDB, Team, Employee, Company } from '@crm/db';
import { teamSchema } from '@crm/lib/validation';
import { getHrSessionScope } from '@/lib/hr/session-scope';
import { zodToFieldErrors, type HrFormState } from '../_components/form-utils';

function parseTeamForm(formData: FormData) {
  const memberEmployeeIds = formData.getAll('memberEmployeeIds').map(String).filter(Boolean);

  const parsed = teamSchema.safeParse({
    companyId: formData.get('companyId'),
    name: formData.get('name'),
    slug: formData.get('slug'),
    leaderEmployeeId: formData.get('leaderEmployeeId'),
    memberEmployeeIds,
    teamType: formData.get('teamType') || undefined,
    isActive: formData.get('isActive') === 'on' || formData.get('isActive') === 'true',
  });

  if (!parsed.success) {
    return { error: 'validation' as const, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  return { parsed: parsed.data };
}

export async function createTeamAction(
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  await requireAnyPermission(['hr:write', 'hr:teams:write']);
  const { userId, permissions } = await getHrSessionScope();

  const result = parseTeamForm(formData);
  if ('error' in result) {
    return { success: false, fieldErrors: result.fieldErrors };
  }

  const { parsed } = result;

  try {
    const team = await createTeam(
      {
        companyId: new mongoose.Types.ObjectId(parsed.companyId),
        name: parsed.name,
        slug: parsed.slug,
        leaderEmployeeId: new mongoose.Types.ObjectId(parsed.leaderEmployeeId),
        memberEmployeeIds: parsed.memberEmployeeIds.map(
          (id: string) => new mongoose.Types.ObjectId(id)
        ),
        teamType: parsed.teamType || undefined,
        isActive: parsed.isActive,
      },
      userId,
      permissions
    );

    revalidatePath('/accounting/teams');
    return { success: true, message: 'Csapat létrehozva.', id: team._id.toString() };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Hiba történt.' };
  }
}

export async function updateTeamAction(
  id: string,
  _prev: HrFormState,
  formData: FormData
): Promise<HrFormState> {
  await requireAnyPermission(['hr:write', 'hr:teams:write']);
  const { userId, permissions } = await getHrSessionScope();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { success: false, message: 'Érvénytelen azonosító.' };
  }

  const result = parseTeamForm(formData);
  if ('error' in result) {
    return { success: false, fieldErrors: result.fieldErrors };
  }

  const { parsed } = result;

  try {
    await updateTeam(
      new mongoose.Types.ObjectId(id),
      {
        name: parsed.name,
        slug: parsed.slug,
        leaderEmployeeId: new mongoose.Types.ObjectId(parsed.leaderEmployeeId),
        memberEmployeeIds: parsed.memberEmployeeIds.map(
          (mid: string) => new mongoose.Types.ObjectId(mid)
        ),
        teamType: parsed.teamType || null,
        isActive: parsed.isActive,
      },
      userId,
      permissions
    );

    revalidatePath('/accounting/teams');
    revalidatePath(`/accounting/teams/${id}`);
    return { success: true, message: 'Csapat mentve.' };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Hiba történt.' };
  }
}

export async function searchEmployeesForTeamAction(companyId: string, q: string) {
  await requireAnyPermission(['hr:write', 'hr:teams:write']);
  if (!mongoose.Types.ObjectId.isValid(companyId)) return [];

  await connectDB();
  const query = q.trim();
  if (query.length < 1) {
    const items = await Employee.find({ companyId, isActive: true })
      .sort({ name: 1 })
      .limit(30)
      .select({ name: 1, department: 1 })
      .lean()
      .exec();
    return items.map((e) => ({
      _id: String(e._id),
      label: e.department ? `${e.name} · ${e.department}` : e.name,
    }));
  }

  const filter = {
    companyId,
    isActive: true,
    name: { $regex: query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
  };

  const items = await Employee.find(filter)
    .sort({ name: 1 })
    .limit(20)
    .select({ name: 1, department: 1 })
    .lean()
    .exec();

  return items.map((e) => ({
    _id: String(e._id),
    label: e.department ? `${e.name} · ${e.department}` : e.name,
  }));
}

export async function loadTeamDetailAction(teamId: string) {
  await requireAnyPermission(['hr:write', 'hr:teams:write']);
  if (!mongoose.Types.ObjectId.isValid(teamId)) return null;

  await connectDB();
  const team = await Team.findById(teamId).lean().exec();
  if (!team) return null;

  const [company, leader, members] = await Promise.all([
    Company.findById(team.companyId).select({ name: 1 }).lean().exec(),
    Employee.findById(team.leaderEmployeeId).select({ name: 1 }).lean().exec(),
    Employee.find({ _id: { $in: team.memberEmployeeIds } })
      .select({ name: 1, department: 1 })
      .lean()
      .exec(),
  ]);

  return {
    _id: String(team._id),
    companyId: String(team.companyId),
    companyName: company?.name ?? '—',
    name: team.name,
    slug: team.slug,
    leaderEmployeeId: String(team.leaderEmployeeId),
    leaderName: leader?.name ?? '—',
    memberEmployeeIds: team.memberEmployeeIds.map(String),
    memberNames: members.map((m) => m.name),
    teamType: team.teamType,
    isActive: team.isActive,
  };
}
