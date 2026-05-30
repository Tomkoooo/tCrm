import { connectDB, LogisticsJob, User, Warehouse, type ILogisticsJob } from '@crm/db';
import type { Types } from 'mongoose';
import { sendTemplatedEmail } from '../mail/mailer';
import { getActorEmail } from '../mail/recipients';
import { getPickup, normalizeJobPickups } from './job-pickups';
import { pickupToRecipientInput, resolvePickupNotificationEmails } from './notification-recipients';

/** Notification kinds — map 1:1 to MailTemplate.key */
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
  /** Explicit recipients; falls back to pickup contacts + warehouse staff */
  recipientEmails?: string[];
  metadata?: Record<string, string>;
  /** User who triggered the action — Reply-To and actorName in template */
  actorUserId?: Types.ObjectId;
};

export type LogisticsNotificationResult = {
  queued: boolean;
  sent: boolean;
  kind: LogisticsNotificationKind;
  pickupReference: string;
  pendingKinds: string[];
  mailSkippedReason?: string;
};

async function buildNotificationVariables(
  job: ILogisticsJob | null,
  pickup: ReturnType<typeof getPickup>,
  actorUserId?: Types.ObjectId
): Promise<Record<string, string>> {
  const wh = await Warehouse.findById(pickup.warehouseId).select({ name: 1 }).lean().exec();
  let actorName = '';
  let actorEmail: string | undefined;
  if (actorUserId) {
    const actor = await User.findById(actorUserId).select({ name: 1, email: 1 }).lean().exec();
    actorName = actor?.name ?? '';
    actorEmail = actor?.email;
  }

  return {
    pickupReference: pickup.reference,
    jobReference: job?.reference ?? '',
    warehouseName: wh?.name ?? '',
    actorName,
    ...(actorEmail ? { actorEmail } : {}),
  };
}

/**
 * Queue notification on pickup and send templated email when SMTP + template are available.
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

  const variables = {
    ...(await buildNotificationVariables(job, pickup, payload.actorUserId)),
    ...payload.metadata,
  };

  const actorEmail = payload.actorUserId ? await getActorEmail(payload.actorUserId) : undefined;

  let sent = false;
  let mailSkippedReason: string | undefined;

  if (resolved.length > 0) {
    const mailResult = await sendTemplatedEmail({
      templateKey: payload.kind,
      to: resolved,
      variables,
      actorUserId: payload.actorUserId,
      actorEmail,
    });
    sent = mailResult.sent;
    mailSkippedReason = mailResult.skipped ? mailResult.reason : undefined;

    if (mailResult.sent) {
      await markLogisticsNotificationSent(payload.jobId, payload.pickupId, payload.kind);
    }
  } else {
    mailSkippedReason = 'No recipients';
  }

  return {
    queued: true,
    sent,
    kind: payload.kind,
    pickupReference: pickup.reference,
    pendingKinds: pickup.notifications.pendingKinds ?? [],
    mailSkippedReason,
  };
}

/** Mark notification as sent after successful mail delivery. */
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
