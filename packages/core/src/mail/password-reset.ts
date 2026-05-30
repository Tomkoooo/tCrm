import crypto from 'node:crypto';
import { connectDB, User, type IUser } from '@crm/db';
import { getAppUrl } from '@crm/lib';
import type { Types } from 'mongoose';
import { sendTemplatedEmail } from './mailer';
import { getActorEmail } from './recipients';

const RESET_TOKEN_BYTES = 32;
const RESET_EXPIRY_HOURS = 24;

function generateResetToken(): string {
  return crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
}

export async function issuePasswordReset(
  userId: Types.ObjectId,
  actorUserId?: Types.ObjectId
): Promise<{ user: IUser; resetLink: string }> {
  await connectDB();
  const user = await User.findById(userId).exec();
  if (!user || !user.isActive) {
    throw new Error('Felhasználó nem található vagy inaktív.');
  }

  const token = generateResetToken();
  const expires = new Date();
  expires.setHours(expires.getHours() + RESET_EXPIRY_HOURS);

  user.resetToken = token;
  user.resetTokenExpires = expires;
  await user.save();

  const resetLink = `${getAppUrl()}/reset-password?token=${token}`;
  const expiresAt = expires.toLocaleString('hu-HU', { dateStyle: 'long', timeStyle: 'short' });

  const actorEmail = actorUserId ? await getActorEmail(actorUserId) : undefined;

  const result = await sendTemplatedEmail({
    templateKey: 'password_reset',
    to: user.email,
    variables: {
      name: user.name,
      resetLink,
      expiresAt,
    },
    actorEmail,
    actorUserId,
  });

  if (!result.sent && result.reason === 'SMTP not configured') {
    throw new Error('SMTP nincs beállítva — a visszaállító link nem küldhető el.');
  }

  return { user, resetLink };
}

export async function findUserByResetToken(token: string): Promise<IUser | null> {
  await connectDB();
  if (!token?.trim()) return null;
  return User.findOne({
    resetToken: token.trim(),
    resetTokenExpires: { $gt: new Date() },
    isActive: true,
  }).exec();
}

export async function completePasswordReset(token: string, passwordHash: string): Promise<IUser> {
  await connectDB();
  const user = await findUserByResetToken(token);
  if (!user) {
    throw new Error('Érvénytelen vagy lejárt link.');
  }

  user.passwordHash = passwordHash;
  user.resetToken = undefined;
  user.resetTokenExpires = undefined;
  await user.save();
  return user;
}
