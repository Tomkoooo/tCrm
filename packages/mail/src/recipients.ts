import { connectDB, Role, User, type IMailTemplate } from '@crm/db-core';
import type { Types } from 'mongoose';

/** Resolve extra recipients from template role keys and explicit user ids. */
export async function resolveTemplateRecipientEmails(
  template: Pick<IMailTemplate, 'recipientRoleKeys' | 'recipientUserIds'>
): Promise<string[]> {
  await connectDB();
  const emails = new Set<string>();

  const roleKeys = template.recipientRoleKeys ?? [];
  if (roleKeys.length > 0) {
    const roles = await Role.find({ key: { $in: roleKeys } })
      .select({ _id: 1 })
      .lean()
      .exec();
    const roleIds = roles.map((r) => r._id);
    if (roleIds.length > 0) {
      const users = await User.find({ roleIds: { $in: roleIds }, isActive: true })
        .select({ email: 1 })
        .lean()
        .exec();
      for (const u of users) {
        const e = u.email?.trim().toLowerCase();
        if (e) emails.add(e);
      }
    }
  }

  const userIds = template.recipientUserIds ?? [];
  if (userIds.length > 0) {
    const users = await User.find({ _id: { $in: userIds }, isActive: true })
      .select({ email: 1 })
      .lean()
      .exec();
    for (const u of users) {
      const e = u.email?.trim().toLowerCase();
      if (e) emails.add(e);
    }
  }

  return [...emails];
}

export function mergeRecipientEmails(primary: string[], extra: string[]): string[] {
  const set = new Set<string>();
  for (const raw of [...primary, ...extra]) {
    const e = raw.trim().toLowerCase();
    if (e) set.add(e);
  }
  return [...set];
}

export async function getActorEmail(
  actorUserId?: Types.ObjectId | string
): Promise<string | undefined> {
  if (!actorUserId) return undefined;
  await connectDB();
  const user = await User.findById(actorUserId).select({ email: 1 }).lean().exec();
  return user?.email?.trim();
}
