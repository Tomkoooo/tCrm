import bcrypt from 'bcryptjs';
import type { Types } from 'mongoose';
import { connectDB, User, type IUser } from '@crm/db-core';

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  roleIds: Types.ObjectId[];
  directPermissionKeys?: string[];
  isActive?: boolean;
};

/** Plain user creation — no employee/company linking (that's the HR module's job). */
export async function createUser(input: CreateUserInput): Promise<IUser> {
  await connectDB();

  const email = input.email.toLowerCase().trim();
  const existing = await User.findOne({ email }).exec();
  if (existing) {
    throw new Error('Ez az e-mail cím már foglalt.');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  return User.create({
    email,
    name: input.name.trim(),
    passwordHash,
    roleIds: input.roleIds,
    directPermissionKeys: input.directPermissionKeys ?? [],
    isActive: input.isActive ?? true,
  });
}
