import { requirePermission } from '@crm/auth';
import { connectDB, MailTemplate } from '@crm/db-core';
import { Container, parseDataTableQuery, buildDataTableMongoQuery } from '@crm/ui';
import type { ColumnDef } from '@crm/ui';
import { MailTemplatesTable, type MailTemplateRow } from './_components/mail-templates-table';

export default async function MailTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission('mail:manage');
  await connectDB();

  const query = parseDataTableQuery(await searchParams);
  const columns: Array<ColumnDef<MailTemplateRow>> = [
    {
      key: 'key',
      label: 'Kulcs',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
    },
    {
      key: 'subject',
      label: 'Tárgy',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
    },
    { key: 'enabled', label: 'Aktív', type: 'boolean', sortable: true, filterable: true },
    {
      key: 'description',
      label: 'Leírás',
      type: 'string',
      sortable: false,
      filterable: false,
      searchable: true,
    },
  ];

  const { filter, sort, skip, limit } = buildDataTableMongoQuery(query, columns);
  const [items, total] = await Promise.all([
    MailTemplate.find({ ...filter, isActive: true })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
    MailTemplate.countDocuments({ ...filter, isActive: true }).exec(),
  ]);

  const data: MailTemplateRow[] = items.map((t) => ({
    _id: String(t._id),
    key: t.key,
    subject: t.subject,
    enabled: Boolean(t.enabled),
    description: t.description ?? '',
  }));

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold">E-mail sablonok</h1>
        <p className="text-muted-foreground text-sm">
          Rendszerüzenetek szövege és értesítési szabályok. A logisztikai események sablonkulcsa
          megegyezik az esemény típusával.
        </p>
      </div>
      <MailTemplatesTable data={data} columns={columns} query={query} total={total} />
    </Container>
  );
}
