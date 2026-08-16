'use server';

import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import { requirePermission } from '@crm/auth';
import { connectDB, MailTemplate, Role, User } from '@crm/db-core';
import { mailTemplateUpdateSchema } from '@crm/admin/validation';

export type MailTemplateFormState =
  | { success: false; fieldErrors?: Record<string, string[]>; message?: string }
  | { success: true; message?: string };

function zodToFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || 'form';
    fieldErrors[key] = fieldErrors[key] ?? [];
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}

export async function updateMailTemplateAction(
  templateId: string,
  _prev: MailTemplateFormState,
  formData: FormData
): Promise<MailTemplateFormState> {
  await requirePermission('mail:manage');
  await connectDB();

  const recipientRoleKeys = formData.getAll('recipientRoleKeys').map(String).filter(Boolean);
  const recipientUserIds = formData.getAll('recipientUserIds').map(String).filter(Boolean);

  const parsed = mailTemplateUpdateSchema.safeParse({
    subject: formData.get('subject'),
    body: formData.get('body'),
    description: formData.get('description') || undefined,
    enabled: formData.get('enabled') === 'on' || formData.get('enabled') === 'true',
    recipientRoleKeys,
    recipientUserIds,
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  const tpl = await MailTemplate.findById(templateId).exec();
  if (!tpl) {
    return { success: false, message: 'Sablon nem található.' };
  }

  const validUserIds = recipientUserIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

  tpl.subject = parsed.data.subject;
  tpl.body = parsed.data.body;
  tpl.description = parsed.data.description;
  tpl.enabled = parsed.data.enabled;
  tpl.recipientRoleKeys = parsed.data.recipientRoleKeys;
  tpl.recipientUserIds = validUserIds as unknown as typeof tpl.recipientUserIds;
  await tpl.save();

  revalidatePath('/admin/mail-templates');
  revalidatePath(`/admin/mail-templates/${templateId}`);
  return { success: true, message: 'Sablon mentve.' };
}

export async function getMailTemplateForEdit(templateId: string) {
  await requirePermission('mail:manage');
  await connectDB();

  const tpl = await MailTemplate.findById(templateId).lean().exec();
  if (!tpl) return null;

  const [roles, users] = await Promise.all([
    Role.find().sort({ name: 1 }).lean().exec(),
    User.find({ isActive: true }).sort({ name: 1 }).select({ name: 1, email: 1 }).lean().exec(),
  ]);

  return {
    id: String(tpl._id),
    key: tpl.key,
    subject: tpl.subject,
    body: tpl.body,
    description: tpl.description ?? '',
    variables: tpl.variables ?? [],
    enabled: Boolean(tpl.enabled),
    recipientRoleKeys: tpl.recipientRoleKeys ?? [],
    recipientUserIds: (tpl.recipientUserIds ?? []).map((id) => String(id)),
    roles: roles.map((r) => ({ key: r.key, name: r.name })),
    users: users.map((u) => ({ id: String(u._id), name: u.name, email: u.email })),
  };
}

export async function listMailTemplatesForTable() {
  await requirePermission('mail:manage');
  await connectDB();
  return MailTemplate.find({ isActive: true }).sort({ key: 1 }).lean().exec();
}
