import { connectDB } from './connection';
import { Role } from './models/Role';
import { User } from './models/User';

export async function hasAnyAdminUser(): Promise<boolean> {
  await connectDB();
  const adminRole = await Role.findOne({ key: 'admin' }).select({ _id: 1 }).lean().exec();
  if (!adminRole?._id) return false;
  const count = await User.countDocuments({ roleIds: adminRole._id, isActive: true }).exec();
  return count > 0;
}
