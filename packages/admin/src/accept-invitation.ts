import { connectDB, User } from '@crm/db-core';
import { createUser } from './users';
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

  const user = await createUser({
    name: invitation.name,
    email: invitation.email,
    password,
    roleIds: invitation.roleIds,
    directPermissionKeys: invitation.directPermissionKeys ?? [],
    isActive: true,
  });

  await markInvitationUsed(invitation._id);

  return { userId: user._id.toString(), email: user.email };
}
