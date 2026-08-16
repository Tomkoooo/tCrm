import { connectDB, User } from '@crm/db';
import type { Types } from 'mongoose';
import { provisionUserWithEmployee } from '../hr/user-provisioning';
import {
  acceptCompanyJoinInvitation,
  findValidInvitationByToken,
  markInvitationUsed,
} from './invitations';

export async function acceptInvitation(
  token: string,
  password: string
): Promise<{
  userId: string;
  email: string;
  needsOnboarding: boolean;
  kind: 'new_user' | 'company_join';
}> {
  const invitation = await findValidInvitationByToken(token);
  if (!invitation) {
    throw new Error('Érvénytelen vagy lejárt meghívó.');
  }

  if (invitation.kind === 'company_join') {
    const result = await acceptCompanyJoinInvitation(invitation);
    return { ...result, kind: 'company_join' };
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

  return {
    userId: user._id.toString(),
    email: user.email,
    needsOnboarding: Boolean(invitation.isEmployee && invitation.companyId),
    kind: 'new_user',
  };
}

export async function acceptCompanyJoinForLoggedInUser(
  token: string,
  userId: Types.ObjectId
): Promise<{ needsOnboarding: boolean }> {
  const invitation = await findValidInvitationByToken(token);
  if (!invitation) {
    throw new Error('Érvénytelen vagy lejárt meghívó.');
  }
  if (invitation.kind !== 'company_join') {
    throw new Error('Ez a meghívó nem cégcsatlakozás.');
  }

  await connectDB();
  const user = await User.findById(userId).exec();
  if (!user || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new Error('A meghívó másik fiókhoz tartozik.');
  }

  const result = await acceptCompanyJoinInvitation(invitation);
  return { needsOnboarding: result.needsOnboarding };
}
