import { connectDB, Permission, Role, User } from '@crm/db-core';

export async function getEffectivePermissionKeys(userId: string): Promise<Set<string>> {
  await connectDB();

  const user = await User.findById(userId)
    .populate({
      path: 'roleIds',
      populate: { path: 'permissionIds' },
    })
    .exec();

  if (!user || !user.isActive) {
    return new Set();
  }

  const keys = new Set<string>(user.directPermissionKeys ?? []);

  for (const role of user.roleIds as unknown as Array<{ permissionIds?: Array<{ key: string }> }>) {
    if (role?.permissionIds) {
      for (const perm of role.permissionIds) {
        if (perm?.key) keys.add(perm.key);
      }
    }
  }

  return keys;
}

export async function userHasPermission(userId: string, permissionKey: string): Promise<boolean> {
  const keys = await getEffectivePermissionKeys(userId);
  return keys.has(permissionKey);
}

export async function userHasAnyPermission(
  userId: string,
  permissionKeys: string[]
): Promise<boolean> {
  const keys = await getEffectivePermissionKeys(userId);
  return permissionKeys.some((key) => keys.has(key));
}

export async function getAllPermissions() {
  await connectDB();
  return Permission.find().sort({ group: 1, key: 1 }).exec();
}

export async function getAllRolesWithPermissions() {
  await connectDB();
  return Role.find().populate('permissionIds').sort({ name: 1 }).exec();
}
