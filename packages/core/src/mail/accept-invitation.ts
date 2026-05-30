import bcrypt from 'bcryptjs';
import { connectDB, User, type IUserInvitation } from '@crm/db';
import type { Types } from 'mongoose';
import { provisionUserWithEmployee } from '../hr/user-provisioning';
import { findValidInvitationByToken, markInvitationUsed } from './invitations';

export async function acceptInvitation(
  token: string,
  password: string
): Promise<{ userId: string; email: string }> {
  const invitation = await findValidInvitationByToken(token);
  if (!invitation) {
    throw new Error('Érvénytelen vagy lejárt meghívó.');
  }

  await connectDB();
  const existing = await User.findOne({ email: invitation.email }).exec();
  if (existing) {
    throw new Error('Ez az e-mail cím már foglalt.');
  }

  const { user } = await provisionUserWithEmployee({
    name: invitation.name,
    email: invitation.email,
    password,
    roleIds: invitation.roleIds,
    directPermissionKeys: invitation.directPermissionKeys ?? [],
    isActive: true,
    skipCompanyScope: true,
    employee:
      invitation.isEmployee && invitation.companyId
        ? {
            companyId: invitation.companyId,
            employeeNumber: invitation.employeeNumber,
            department: invitation.department,
            phone: invitation.phone,
            hrNotes: invitation.hrNotes,
          }
        : undefined,
  });

  await markInvitationUsed(invitation._id);

  return { userId: user._id.toString(), email: user.email };
}
