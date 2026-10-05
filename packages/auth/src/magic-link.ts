import crypto from 'node:crypto';
import { connectDB, MagicLink, User, type MagicLinkPurpose } from '@crm/db-core';
import type { Types } from 'mongoose';

/**
 * One-click sign-in links for notification emails.
 *
 * The raw token exists only inside the email; the database stores a SHA-256 hash.
 * A link stays usable until it expires (rather than burning on first hit) because
 * mail clients and link scanners routinely pre-fetch URLs — a strict single use
 * would leave the recipient locked out of their own schedule. Every hit is counted
 * and timestamped, and a link can be revoked.
 */

export const MAGIC_LINK_DEFAULT_TTL_DAYS = 14;

export function hashMagicToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/** Only in-app relative paths — never an absolute URL (open-redirect guard). */
export function sanitizeMagicRedirect(redirectTo?: string): string | undefined {
  const raw = redirectTo?.trim();
  if (!raw) return undefined;
  if (!raw.startsWith('/')) return undefined;
  if (raw.startsWith('//')) return undefined;
  if (raw.includes('\\') || raw.includes('\n') || raw.includes('\r')) return undefined;
  return raw.slice(0, 500);
}

export type CreateMagicLinkParams = {
  userId: Types.ObjectId | string;
  purpose: MagicLinkPurpose;
  redirectTo?: string;
  expiresInDays?: number;
  createdBy?: Types.ObjectId | string;
};

export type CreateMagicLinkResult = {
  token: string;
  expiresAt: Date;
};

export async function createMagicLink(
  params: CreateMagicLinkParams
): Promise<CreateMagicLinkResult> {
  await connectDB();

  const token = crypto.randomBytes(32).toString('hex');
  const days = params.expiresInDays ?? MAGIC_LINK_DEFAULT_TTL_DAYS;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await MagicLink.create({
    userId: params.userId,
    tokenHash: hashMagicToken(token),
    purpose: params.purpose,
    redirectTo: sanitizeMagicRedirect(params.redirectTo),
    expiresAt,
    useCount: 0,
    createdBy: params.createdBy,
  });

  return { token, expiresAt };
}

export type ConsumedMagicLink = {
  userId: string;
  email: string;
  name: string;
  image?: string;
  redirectTo?: string;
};

/** Validates a raw token and records the hit. Returns null for anything unusable. */
export async function consumeMagicLink(token: string): Promise<ConsumedMagicLink | null> {
  if (!token?.trim()) return null;
  await connectDB();

  const link = await MagicLink.findOne({ tokenHash: hashMagicToken(token) }).exec();
  if (!link) return null;
  if (link.revokedAt) return null;
  if (link.expiresAt.getTime() <= Date.now()) return null;

  const user = await User.findById(link.userId).select('email name image isActive').lean().exec();
  if (!user || !user.isActive) return null;

  link.useCount += 1;
  link.lastUsedAt = new Date();
  await link.save();

  return {
    userId: String(user._id),
    email: user.email,
    name: user.name,
    image: user.image ?? undefined,
    redirectTo: sanitizeMagicRedirect(link.redirectTo),
  };
}

/** Revoke every outstanding link of a purpose for a user (e.g. on offboarding). */
export async function revokeMagicLinks(
  userId: Types.ObjectId | string,
  purpose?: MagicLinkPurpose
): Promise<number> {
  await connectDB();
  const filter: Record<string, unknown> = { userId, revokedAt: { $exists: false } };
  if (purpose) filter.purpose = purpose;
  const result = await MagicLink.updateMany(filter, { $set: { revokedAt: new Date() } }).exec();
  return result.modifiedCount ?? 0;
}
