import crypto from 'node:crypto';
import type { Types } from 'mongoose';
import { connectDB, User } from '@crm/db-core';
import { getAppUrl, sendTemplatedEmail } from '@crm/mail';
import { UserInvitation, type IUserInvitation } from './models/UserInvitation';

export type CreateInvitationInput = {
  email: string;
  name: string;
  roleIds: Types.ObjectId[];
  directPermissionKeys?: string[];
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
    expiresAt,
    isUsed: false,
    invitedBy: input.invitedBy,
  });

  return { invitation, inviteLink: buildInviteLink(token) };
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
    variables: { name: invitation.name, inviteLink, expiresAt, inviterName },
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
  return UserInvitation.findOne({
    token: token.trim(),
    isUsed: false,
    expiresAt: { $gt: new Date() },
  }).exec();
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
