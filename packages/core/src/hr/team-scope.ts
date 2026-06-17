import { connectDB, Employee, Team } from '@crm/db';
import mongoose, { type Types } from 'mongoose';
import { assertCompanyInScope } from './company-scope';

export function hasHrWriteScheduleAccess(permissions: string[]): boolean {
  return permissions.includes('hr:write') || permissions.includes('hr:teams:write');
}

export async function getLeaderEmployeeIdsForUser(
  userId: Types.ObjectId,
  companyId?: Types.ObjectId
): Promise<Types.ObjectId[]> {
  await connectDB();
  const empFilter: Record<string, unknown> = { userId, isActive: true };
  if (companyId) empFilter.companyId = companyId;

  const employees = await Employee.find(empFilter).select({ _id: 1 }).lean().exec();
  if (!employees.length) return [];

  const employeeIds = employees.map((e) => e._id as Types.ObjectId);
  const teams = await Team.find({
    isActive: true,
    leaderEmployeeId: { $in: employeeIds },
    ...(companyId ? { companyId } : {}),
  })
    .select({ leaderEmployeeId: 1 })
    .lean()
    .exec();

  const leaderSet = new Set(teams.map((t) => String(t.leaderEmployeeId)));
  return employeeIds.filter((id) => leaderSet.has(id.toString()));
}

export async function userLeadsAnyTeam(userId: Types.ObjectId): Promise<boolean> {
  const leaderIds = await getLeaderEmployeeIdsForUser(userId);
  return leaderIds.length > 0;
}

export async function listManagedEmployeeIds(
  actorUserId: Types.ObjectId,
  companyId?: Types.ObjectId,
  permissions: string[] = []
): Promise<Types.ObjectId[]> {
  await connectDB();

  // If they have global HR write/read or teams write/read, they can manage/view ALL teams
  const hasGlobalAccess =
    permissions.includes('hr:write') ||
    permissions.includes('hr:read') ||
    permissions.includes('hr:teams:write') ||
    permissions.includes('hr:teams:read');

  if (hasGlobalAccess) {
    const teamFilter = companyId ? { companyId, isActive: true } : { isActive: true };
    const teams = await Team.find(teamFilter)
      .select({ leaderEmployeeId: 1, memberEmployeeIds: 1 })
      .lean()
      .exec();
    const ids = new Set<string>();
    for (const team of teams) {
      if (team.leaderEmployeeId) ids.add(team.leaderEmployeeId.toString());
      for (const memberId of team.memberEmployeeIds ?? []) {
        ids.add(memberId.toString());
      }
    }
    return [...ids].map((id) => new mongoose.Types.ObjectId(id));
  }

  const leaderEmployeeIds = await getLeaderEmployeeIdsForUser(actorUserId, companyId);
  if (!leaderEmployeeIds.length) return [];

  const teams = await Team.find({
    isActive: true,
    leaderEmployeeId: { $in: leaderEmployeeIds },
    ...(companyId ? { companyId } : {}),
  })
    .select({ memberEmployeeIds: 1 })
    .lean()
    .exec();

  const ids = new Set<string>();
  for (const team of teams) {
    for (const memberId of team.memberEmployeeIds ?? []) {
      ids.add(String(memberId));
    }
  }
  return [...ids].map((id) => new mongoose.Types.ObjectId(id));
}

export async function canManageEmployeeSchedule(
  actorUserId: Types.ObjectId,
  targetEmployeeId: Types.ObjectId,
  permissions: string[]
): Promise<boolean> {
  if (hasHrWriteScheduleAccess(permissions)) {
    await connectDB();
    const emp = await Employee.findById(targetEmployeeId).select({ companyId: 1 }).lean().exec();
    if (!emp) return false;
    try {
      await assertCompanyInScope(emp.companyId as Types.ObjectId, actorUserId, permissions);
      return true;
    } catch {
      return false;
    }
  }

  const managedIds = await listManagedEmployeeIds(actorUserId, undefined, permissions);
  return managedIds.some((id) => id.equals(targetEmployeeId));
}

export async function assertCanManageEmployeeSchedule(
  actorUserId: Types.ObjectId,
  targetEmployeeId: Types.ObjectId,
  permissions: string[]
): Promise<void> {
  const allowed = await canManageEmployeeSchedule(actorUserId, targetEmployeeId, permissions);
  if (!allowed) {
    throw new Error('Nincs jogosultság ehhez a dolgozó beosztásához.');
  }
}

export async function listTeamsLedByUser(actorUserId: Types.ObjectId, companyId?: Types.ObjectId) {
  await connectDB();
  const leaderEmployeeIds = await getLeaderEmployeeIdsForUser(actorUserId, companyId);
  if (!leaderEmployeeIds.length) return [];

  return Team.find({
    isActive: true,
    leaderEmployeeId: { $in: leaderEmployeeIds },
    ...(companyId ? { companyId } : {}),
  })
    .sort({ name: 1 })
    .exec();
}

export async function assertCanReadTeamSchedule(
  actorUserId: Types.ObjectId,
  permissions: string[]
): Promise<void> {
  const hrReadKeys = [
    'hr:read',
    'hr:write',
    'hr:approve',
    'hr:reports',
    'hr:teams:read',
    'hr:teams:write',
  ];
  if (hrReadKeys.some((k) => permissions.includes(k))) return;

  const leads = await userLeadsAnyTeam(actorUserId);
  if (!leads) {
    throw new Error('Nincs jogosultság a csapat beosztás megtekintéséhez.');
  }
}
