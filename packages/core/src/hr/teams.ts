import { connectDB, Employee, Team, type ITeam } from '@crm/db';
import type { Types } from 'mongoose';
import { assertCompanyInScope } from './company-scope';

async function assertEmployeesInCompany(
  companyId: Types.ObjectId,
  employeeIds: Types.ObjectId[]
): Promise<void> {
  if (!employeeIds.length) return;
  const count = await Employee.countDocuments({
    _id: { $in: employeeIds },
    companyId,
  }).exec();
  if (count !== employeeIds.length) {
    throw new Error('Minden csapattag ugyanahhoz a céghez tartozzon.');
  }
}

async function syncEmployeeTeamIds(
  teamId: Types.ObjectId,
  companyId: Types.ObjectId,
  previousMemberIds: Types.ObjectId[],
  nextMemberIds: Types.ObjectId[],
  previousLeaderId: Types.ObjectId,
  nextLeaderId: Types.ObjectId
): Promise<void> {
  const prevSet = new Set([
    ...previousMemberIds.map((id) => id.toString()),
    previousLeaderId.toString(),
  ]);
  const nextSet = new Set([...nextMemberIds.map((id) => id.toString()), nextLeaderId.toString()]);

  for (const idStr of prevSet) {
    if (!nextSet.has(idStr)) {
      await Employee.updateOne({ _id: idStr, companyId }, { $pull: { teamIds: teamId } }).exec();
    }
  }

  for (const idStr of nextSet) {
    await Employee.updateOne({ _id: idStr, companyId }, { $addToSet: { teamIds: teamId } }).exec();
  }
}

export async function listTeamsForCompany(
  companyId: Types.ObjectId,
  actorUserId: Types.ObjectId,
  permissions: string[]
): Promise<ITeam[]> {
  await connectDB();
  await assertCompanyInScope(companyId, actorUserId, permissions);
  return Team.find({ companyId }).sort({ name: 1 }).exec();
}

export async function getTeamById(id: Types.ObjectId): Promise<ITeam | null> {
  await connectDB();
  return Team.findById(id).exec();
}

export async function createTeam(
  data: {
    companyId: Types.ObjectId;
    name: string;
    slug: string;
    leaderEmployeeId: Types.ObjectId;
    memberEmployeeIds: Types.ObjectId[];
    teamType?: ITeam['teamType'];
    isActive: boolean;
  },
  actorUserId: Types.ObjectId,
  permissions: string[]
): Promise<ITeam> {
  await connectDB();
  await assertCompanyInScope(data.companyId, actorUserId, permissions);

  const memberIds = data.memberEmployeeIds.filter((id) => !id.equals(data.leaderEmployeeId));
  await assertEmployeesInCompany(data.companyId, [data.leaderEmployeeId, ...memberIds]);

  const existing = await Team.findOne({ companyId: data.companyId, slug: data.slug }).exec();
  if (existing) throw new Error('Ez a slug már létezik ebben a cégben.');

  const team = await Team.create({
    ...data,
    memberEmployeeIds: memberIds,
  });

  await syncEmployeeTeamIds(
    team._id,
    data.companyId,
    [],
    memberIds,
    data.leaderEmployeeId,
    data.leaderEmployeeId
  );

  return team;
}

export async function updateTeam(
  id: Types.ObjectId,
  data: Partial<{
    name: string;
    slug: string;
    leaderEmployeeId: Types.ObjectId;
    memberEmployeeIds: Types.ObjectId[];
    teamType: ITeam['teamType'] | null;
    isActive: boolean;
  }>,
  actorUserId: Types.ObjectId,
  permissions: string[]
): Promise<ITeam> {
  await connectDB();
  const team = await Team.findById(id).exec();
  if (!team) throw new Error('Csapat nem található.');
  await assertCompanyInScope(team.companyId, actorUserId, permissions);

  const previousMembers = [...team.memberEmployeeIds];
  const previousLeader = team.leaderEmployeeId;

  if (data.slug !== undefined && data.slug !== team.slug) {
    const existing = await Team.findOne({
      companyId: team.companyId,
      slug: data.slug,
      _id: { $ne: id },
    }).exec();
    if (existing) throw new Error('Ez a slug már létezik ebben a cégben.');
    team.slug = data.slug;
  }

  if (data.name !== undefined) team.name = data.name;
  if (data.isActive !== undefined) team.isActive = data.isActive;
  if (data.teamType !== undefined) team.teamType = data.teamType ?? undefined;

  const leaderId = data.leaderEmployeeId ?? team.leaderEmployeeId;
  const memberIds =
    data.memberEmployeeIds !== undefined
      ? data.memberEmployeeIds.filter((mid) => !mid.equals(leaderId))
      : team.memberEmployeeIds;

  await assertEmployeesInCompany(team.companyId, [leaderId, ...memberIds]);

  team.leaderEmployeeId = leaderId;
  team.memberEmployeeIds = memberIds;
  await team.save();

  await syncEmployeeTeamIds(
    team._id,
    team.companyId,
    previousMembers,
    memberIds,
    previousLeader,
    leaderId
  );

  return team;
}

export async function listTeamsForEmployee(employeeId: Types.ObjectId): Promise<ITeam[]> {
  await connectDB();
  return Team.find({
    isActive: true,
    $or: [{ leaderEmployeeId: employeeId }, { memberEmployeeIds: employeeId }],
  })
    .sort({ name: 1 })
    .exec();
}

export async function assertSupervisorNoCycle(
  employeeId: Types.ObjectId,
  supervisorEmployeeId: Types.ObjectId | null | undefined
): Promise<void> {
  if (!supervisorEmployeeId) return;
  if (employeeId.equals(supervisorEmployeeId)) {
    throw new Error('A dolgozó nem lehet a saját felettese.');
  }

  await connectDB();
  const visited = new Set<string>([employeeId.toString()]);
  let current: Types.ObjectId | undefined = supervisorEmployeeId;

  for (let depth = 0; depth < 32 && current; depth++) {
    const key = current.toString();
    if (visited.has(key)) {
      throw new Error('A felettes lánc kört tartalmaz.');
    }
    visited.add(key);
    const next = await Employee.findById(current).select({ supervisorEmployeeId: 1 }).lean().exec();
    current = next?.supervisorEmployeeId as Types.ObjectId | undefined;
  }
}
