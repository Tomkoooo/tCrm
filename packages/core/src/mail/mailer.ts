import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { connectDB, MailTemplate } from '@crm/db';
import { getSmtpFrom, isSmtpConfigured } from '@crm/lib';
import type { Types } from 'mongoose';
import { renderTemplateString } from './template';
import { getActorEmail, mergeRecipientEmails, resolveTemplateRecipientEmails } from './recipients';

export type SendTemplatedEmailOptions = {
  templateKey: string;
  to: string | string[];
  variables: Record<string, string>;
  /** Person whose action triggered the mail — used as Reply-To. */
  actorEmail?: string;
  actorUserId?: Types.ObjectId | string;
};

export type SendTemplatedEmailResult = {
  sent: boolean;
  skipped?: boolean;
  reason?: string;
  messageId?: string;
  recipients?: string[];
};

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!isSmtpConfigured()) return null;
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    const secure =
      process.env.SMTP_SECURE?.trim() === '1' ||
      process.env.SMTP_SECURE?.trim().toLowerCase() === 'true';
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });
  }
  return transporter;
}

export async function sendTemplatedEmail(
  options: SendTemplatedEmailOptions
): Promise<SendTemplatedEmailResult> {
  await connectDB();

  const template = await MailTemplate.findOne({
    key: options.templateKey,
    isActive: true,
  }).exec();

  if (!template) {
    return { sent: false, skipped: true, reason: `Template not found: ${options.templateKey}` };
  }

  if (!template.enabled) {
    return { sent: false, skipped: true, reason: `Template disabled: ${options.templateKey}` };
  }

  const transport = getTransporter();
  if (!transport) {
    return { sent: false, skipped: true, reason: 'SMTP not configured' };
  }

  const primary = Array.isArray(options.to) ? options.to : [options.to];
  const extra = await resolveTemplateRecipientEmails(template);
  const recipients = mergeRecipientEmails(primary, extra);

  if (recipients.length === 0) {
    return { sent: false, skipped: true, reason: 'No recipients' };
  }

  const subject = renderTemplateString(template.subject, options.variables);
  const html = renderTemplateString(template.body, options.variables);

  const replyTo =
    options.actorEmail?.trim() ||
    (options.actorUserId ? await getActorEmail(options.actorUserId) : undefined) ||
    getSmtpFrom();

  const from = getSmtpFrom();

  const info = await transport.sendMail({
    from,
    to: recipients.join(', '),
    subject,
    html,
    replyTo,
  });

  return {
    sent: true,
    messageId: info.messageId,
    recipients,
  };
}
