import type { Types } from 'mongoose';
import type { ISecretProject } from '@crm/db';

export type SecretAccessUser = {
  id: string;
  permissions: string[];
  roleIds: string[];
};

function hasPermission(user: SecretAccessUser, key: string): boolean {
  return user.permissions.includes(key);
}

export function canManageAllSecrets(user: SecretAccessUser): boolean {
  return hasPermission(user, 'secrets:manage');
}

export function canReadSecretProject(
  user: SecretAccessUser,
  project: Pick<ISecretProject, 'createdBy' | 'allowedUsers' | 'allowedRoles'>
): boolean {
  if (!hasPermission(user, 'secrets:read')) return false;
  if (canManageAllSecrets(user)) return true;

  const userId = user.id;
  if (project.createdBy.toString() === userId) return true;

  if (project.allowedUsers.some((id) => id.toString() === userId)) return true;

  const roleSet = new Set(user.roleIds);
  if (project.allowedRoles.some((id) => roleSet.has(id.toString()))) return true;

  return false;
}

export function canWriteSecretProject(
  user: SecretAccessUser,
  project: Pick<ISecretProject, 'createdBy' | 'allowedUsers' | 'allowedRoles'>
): boolean {
  if (!hasPermission(user, 'secrets:write')) return false;
  if (canManageAllSecrets(user)) return true;
  return canReadSecretProject(user, project);
}

export function canDeleteSecretProject(
  user: SecretAccessUser,
  project: Pick<ISecretProject, 'createdBy'>
): boolean {
  if (!hasPermission(user, 'secrets:delete')) return false;
  if (canManageAllSecrets(user)) return true;
  return project.createdBy.toString() === user.id;
}

export function canManageSecretProjectAccess(
  user: SecretAccessUser,
  project: Pick<ISecretProject, 'createdBy'>
): boolean {
  if (canManageAllSecrets(user)) return true;
  return hasPermission(user, 'secrets:write') && project.createdBy.toString() === user.id;
}

export function buildSecretProjectListFilter(user: SecretAccessUser): Record<string, unknown> {
  if (canManageAllSecrets(user)) {
    return {};
  }

  const userId = user.id;
  const roleIds = user.roleIds.filter((id) => /^[a-f\d]{24}$/i.test(id));

  const or: Record<string, unknown>[] = [{ createdBy: userId }];

  if (roleIds.length > 0) {
    or.push({ allowedRoles: { $in: roleIds } });
  }
  or.push({ allowedUsers: userId });

  return { $or: or };
}

export function toSecretAccessUser(
  sessionUser: { id: string; permissions: string[] },
  roleIds: Types.ObjectId[] | string[]
): SecretAccessUser {
  return {
    id: sessionUser.id,
    permissions: sessionUser.permissions,
    roleIds: roleIds.map((id) => id.toString()),
  };
}
