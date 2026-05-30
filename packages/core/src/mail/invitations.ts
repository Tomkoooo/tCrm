import crypto from 'node:crypto';
import { connectDB, User, UserInvitation, type IUserInvitation } from '@crm/db';
import { getAppUrl } from '@crm/lib';
import type { Types } from 'mongoose';
import { sendTemplatedEmail } from './mailer';
import { getActorEmail } from './recipients';

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

export async function createUserInvitation(
  input: CreateInvitationInput
): Promise<{ invitation: IUserInvitation; inviteLink: string }> {
  await connectDB();

  const email = input.email.toLowerCase().trim();
  const existingUser = await User.findOne({ email }).exec();
  if (existingUser) {
    throw new Error('Ez az e-mail cím már foglalt.');
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

  const inviteLink = `${getAppUrl()}/register/invite?token=${token}`;
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
