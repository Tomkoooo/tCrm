import { connectDB, MailTemplate } from '@crm/db-core';

export type BaselineMailTemplate = {
  key: string;
  subject: string;
  body: string;
  description: string;
  variables: string[];
  enabled: boolean;
  recipientRoleKeys?: string[];
};

export type SeedMailTemplatesOptions = {
  /** When true, overwrite existing templates. Default: false (seed missing only). */
  overwrite?: boolean;
};

/** Any module can seed its own baseline templates; keys are the only shared contract. */
export async function seedMailTemplates(
  templates: BaselineMailTemplate[],
  options: SeedMailTemplatesOptions = {}
): Promise<void> {
  await connectDB();
  const overwrite = options.overwrite ?? process.env.SEED_OVERWRITE_TEMPLATES?.trim() === '1';

  for (const tpl of templates) {
    const existing = await MailTemplate.findOne({ key: tpl.key }).exec();
    if (existing && !overwrite) {
      continue;
    }
    if (existing && overwrite) {
      existing.subject = tpl.subject;
      existing.body = tpl.body;
      existing.description = tpl.description;
      existing.variables = tpl.variables;
      existing.enabled = tpl.enabled;
      existing.recipientRoleKeys = tpl.recipientRoleKeys ?? [];
      existing.isActive = true;
      await existing.save();
    } else if (!existing) {
      await MailTemplate.create({
        key: tpl.key,
        subject: tpl.subject,
        body: tpl.body,
        description: tpl.description,
        variables: tpl.variables,
        enabled: tpl.enabled,
        recipientRoleKeys: tpl.recipientRoleKeys ?? [],
        recipientUserIds: [],
        isActive: true,
      });
    }
  }
}
