import { connectDB, User, Warehouse } from '@crm/db';
import type { ILogisticsPickup } from '@crm/db';
import type { Types } from 'mongoose';

/** Warehouse-assigned staff + pickup team + explicit contact emails. */
export async function resolvePickupNotificationEmails(
  pickup: PickupRecipientInput
): Promise<string[]> {
  await connectDB();

  const emails = new Set<string>();

  for (const raw of pickup.contactEmails ?? []) {
    const e = raw.trim().toLowerCase();
    if (e) emails.add(e);
  }

  const userIds = new Set<string>();
  for (const id of pickup.teamMemberIds ?? []) {
    userIds.add(String(id));
  }

  const wh = await Warehouse.findById(pickup.warehouseId)
    .select({ assignedUserIds: 1 })
    .lean()
    .exec();
  for (const id of wh?.assignedUserIds ?? []) {
    userIds.add(String(id));
  }

  if (userIds.size > 0) {
    const users = await User.find({ _id: { $in: [...userIds] }, isActive: true })
      .select({ email: 1 })
      .lean()
      .exec();
    for (const u of users) {
      const e = u.email?.trim().toLowerCase();
      if (e) emails.add(e);
    }
  }

  if (pickup.recipientEmails?.length) {
    for (const raw of pickup.recipientEmails) {
      const e = raw.trim().toLowerCase();
      if (e) emails.add(e);
    }
  }

  return [...emails];
}

export type PickupRecipientInput = {
  warehouseId: Types.ObjectId;
  teamMemberIds?: Types.ObjectId[];
  contactEmails?: string[];
  recipientEmails?: string[];
};

export function pickupToRecipientInput(pickup: ILogisticsPickup): PickupRecipientInput {
  return {
    warehouseId: pickup.warehouseId,
    teamMemberIds: pickup.teamMemberIds,
    contactEmails: pickup.contactEmails,
  };
}
