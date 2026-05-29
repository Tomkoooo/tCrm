import { connectDB, LogisticsJob } from '@crm/db';
import type { Types } from 'mongoose';
import { getPickup, normalizeJobPickups } from './job-pickups';
import { pickupToRecipientInput, resolvePickupNotificationEmails } from './notification-recipients';

/** Notification kinds — extend when mail worker is implemented. */
export type LogisticsNotificationKind =
  | 'job_scheduled'
  | 'pickup_gathered'
  | 'pickup_ready_for_collection'
  | 'pickup_delivered'
  | 'pickup_return_reminder'
  | 'pickup_checkin_complete';

export type LogisticsNotificationPayload = {
  kind: LogisticsNotificationKind;
  jobId: Types.ObjectId;
  pickupId: Types.ObjectId;
  /** Explicit recipients; falls back to pickup.contactEmails + team emails later */
  recipientEmails?: string[];
  metadata?: Record<string, string>;
};

export type LogisticsNotificationResult = {
  queued: boolean;
  kind: LogisticsNotificationKind;
  pickupReference: string;
  pendingKinds: string[];
};

/**
 * Queue a logistics notification for a future email worker.
 * Today: records `pendingKinds` on the pickup; does not send mail.
 */
export async function enqueueLogisticsNotification(
  payload: LogisticsNotificationPayload
): Promise<LogisticsNotificationResult> {
  await connectDB();

  const job = await LogisticsJob.findById(payload.jobId);
  if (!job) throw new Error('Job not found');

  normalizeJobPickups(job);
  const pickup = getPickup(job, payload.pickupId);

  const notifications = pickup.notifications ?? {};
  const pending = new Set(notifications.pendingKinds ?? []);
  pending.add(payload.kind);

  const resolved = payload.recipientEmails?.length
    ? payload.recipientEmails.map((e) => e.trim().toLowerCase()).filter(Boolean)
    : await resolvePickupNotificationEmails(pickupToRecipientInput(pickup));

  pickup.notifications = {
    ...notifications,
    pendingKinds: [...pending],
    pendingRecipientEmails: resolved,
  };

  job.markModified('pickups');
  await job.save();

  return {
    queued: true,
    kind: payload.kind,
    pickupReference: pickup.reference,
    pendingKinds: pickup.notifications.pendingKinds ?? [],
  };
}

/** Mark notification as sent (call from future mail worker). */
export async function markLogisticsNotificationSent(
  jobId: Types.ObjectId,
  pickupId: Types.ObjectId,
  kind: LogisticsNotificationKind
): Promise<void> {
  await connectDB();
  const job = await LogisticsJob.findById(jobId);
  if (!job) throw new Error('Job not found');

  normalizeJobPickups(job);
  const pickup = getPickup(job, pickupId);
  const pending = (pickup.notifications?.pendingKinds ?? []).filter((k) => k !== kind);
  pickup.notifications = {
    ...pickup.notifications,
    lastKind: kind,
    lastSentAt: new Date(),
    pendingKinds: pending,
  };
  job.markModified('pickups');
  await job.save();
}
