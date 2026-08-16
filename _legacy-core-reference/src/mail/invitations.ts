import crypto from 'node:crypto';
import { connectDB, Employee, User, UserInvitation, type IUserInvitation } from '@crm/db';
import { getAppUrl } from '@crm/lib';
import type { Types } from 'mongoose';
import { linkUserToCompanyEmployee } from '../hr/user-provisioning';
import { sendTemplatedEmail } from './mailer';

export type CreateInvitationInput = {
  email: string;
  name: string;
  roleIds: Types.ObjectId[];
  directPermissionKeys?: string[];
  companyId?: Types.ObjectId;
  isEmployee?: boolean;
  employeeNumber?: string;
  department?: string;
  phone?: string;
  hrNotes?: string;
  invitedBy: Types.ObjectId;
  expiresInDays?: number;
};

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function buildInviteLink(token: string): string {
  return `${getAppUrl()}/register/invite?token=${token}`;
}

export type InvitationStatus = 'pending' | 'used' | 'expired';

export function getInvitationStatus(inv: { isUsed: boolean; expiresAt: Date }): InvitationStatus {
  if (inv.isUsed) return 'used';
  if (inv.expiresAt < new Date()) return 'expired';
  return 'pending';
}

export async function createUserInvitation(
  input: CreateInvitationInput
): Promise<{ invitation: IUserInvitation; inviteLink: string }> {
  await connectDB();

  const email = input.email.toLowerCase().trim();
  const existingUser = await User.findOne({ email }).exec();
  const isCompanyJoin = Boolean(existingUser) && Boolean(input.isEmployee && input.companyId);

  if (existingUser && !isCompanyJoin) {
    throw new Error('Ez az e-mail cím már foglalt.');
  }

  if (isCompanyJoin && existingUser && input.companyId) {
    const alreadyMember = await Employee.findOne({
      userId: existingUser._id,
      companyId: input.companyId,
    }).exec();
    if (alreadyMember) {
      throw new Error('A felhasználó már dolgozó ebben a cégben.');
    }
  }

  const pending = await UserInvitation.findOne({
    email,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  }).exec();
  if (pending) {
    throw new Error('Ehhez az e-mailhez már van érvényes meghívó.');
  }

  const days = input.expiresInDays ?? 7;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);

  const token = generateToken();
  const invitation = await UserInvitation.create({
    email,
    name: input.name.trim(),
    token,
    kind: isCompanyJoin ? 'company_join' : 'new_user',
    roleIds: input.roleIds,
    directPermissionKeys: input.directPermissionKeys ?? [],
    companyId: input.companyId,
    isEmployee: input.isEmployee ?? Boolean(input.companyId),
    employeeNumber: input.employeeNumber,
    department: input.department,
    phone: input.phone,
    hrNotes: input.hrNotes,
    expiresAt,
    isUsed: false,
    invitedBy: input.invitedBy,
  });

  const inviteLink = buildInviteLink(token);
  return { invitation, inviteLink };
}

export async function sendInvitationEmail(
  invitation: IUserInvitation,
  inviteLink: string
): Promise<void> {
  const inviter = await User.findById(invitation.invitedBy)
    .select({ name: 1, email: 1 })
    .lean()
    .exec();
  const inviterName = inviter?.name ?? 'Adminisztrátor';
  const actorEmail = inviter?.email;

  const expiresAt = invitation.expiresAt.toLocaleString('hu-HU', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const result = await sendTemplatedEmail({
    templateKey: 'user_invitation',
    to: invitation.email,
    variables: {
      name: invitation.name,
      inviteLink,
      expiresAt,
      inviterName,
    },
    actorEmail,
  });

  if (!result.sent && !result.skipped) {
    throw new Error(result.reason ?? 'E-mail küldése sikertelen.');
  }
  if (result.skipped && result.reason === 'SMTP not configured') {
    throw new Error('SMTP nincs beállítva — a meghívó létrejött, de az e-mail nem ment ki.');
  }
}

export async function findValidInvitationByToken(token: string): Promise<IUserInvitation | null> {
  await connectDB();
  if (!token?.trim()) return null;
  const invitation = await UserInvitation.findOne({
    token: token.trim(),
    isUsed: false,
    expiresAt: { $gt: new Date() },
  }).exec();
  return invitation;
}

export async function markInvitationUsed(invitationId: Types.ObjectId): Promise<void> {
  await connectDB();
  await UserInvitation.updateOne({ _id: invitationId }, { $set: { isUsed: true } }).exec();
}

export async function createAndSendInvitation(
  input: CreateInvitationInput
): Promise<{ invitation: IUserInvitation; inviteLink: string }> {
  const { invitation, inviteLink } = await createUserInvitation(input);
  await sendInvitationEmail(invitation, inviteLink);
  return { invitation, inviteLink };
}

export async function acceptCompanyJoinInvitation(
  invitation: IUserInvitation
): Promise<{ userId: string; email: string; needsOnboarding: boolean }> {
  await connectDB();
  const user = await User.findOne({ email: invitation.email }).exec();
  if (!user) {
    throw new Error('Felhasználó nem található — érvénytelen cégmeghívó.');
  }
  if (!invitation.companyId) {
    throw new Error('A meghívó nem tartalmaz céget.');
  }

  await linkUserToCompanyEmployee(
    user._id,
    {
      name: invitation.name.trim() || user.name,
      email: invitation.email,
      companyId: invitation.companyId,
      employeeNumber: invitation.employeeNumber,
      department: invitation.department,
      phone: invitation.phone,
      hrNotes: invitation.hrNotes,
      isActive: true,
    },
    { skipCompanyScope: true }
  );

  await User.updateOne({ _id: user._id }, { $unset: { employeeOnboardingCompletedAt: 1 } }).exec();

  await markInvitationUsed(invitation._id);

  return {
    userId: user._id.toString(),
    email: user.email,
    needsOnboarding: true,
  };
}
