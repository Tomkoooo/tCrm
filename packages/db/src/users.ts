import { connectDB } from './connection';
import { Role } from './models/Role';
import { User } from './models/User';

export async function getAdminRoleId(): Promise<string | null> {
  await connectDB();
  const adminRole = await Role.findOne({ key: 'admin' }).select({ _id: 1 }).lean().exec();
  return adminRole?._id ? String(adminRole._id) : null;
}

export async function countActiveAdminUsers(): Promise<number> {
  const adminRoleId = await getAdminRoleId();
  if (!adminRoleId) return 0;
  return User.countDocuments({ roleIds: adminRoleId, isActive: true }).exec();
}

export async function userHasAdminRole(userId: string): Promise<boolean> {
  const adminRoleId = await getAdminRoleId();
  if (!adminRoleId) return false;
  const user = await User.findById(userId).select({ roleIds: 1, isActive: 1 }).lean().exec();
  if (!user?.isActive) return false;
  return (user.roleIds ?? []).some((id) => String(id) === adminRoleId);
}

/** True when this user is the only active admin — deactivation or admin role removal must be blocked. */
export async function isLastActiveAdmin(userId: string): Promise<boolean> {
  const isAdmin = await userHasAdminRole(userId);
  if (!isAdmin) return false;
  const count = await countActiveAdminUsers();
  return count <= 1;
}
