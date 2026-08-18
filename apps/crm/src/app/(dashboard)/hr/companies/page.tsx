import { requirePermission } from '@crm/auth';
import { connectDB, Company } from '@crm/db-core';
import { ensureDefaultCompany } from '@crm/hr';
import { Container, parseDataTableQuery, buildDataTableMongoQuery } from '@crm/ui';
import type { ColumnDef } from '@crm/ui';
import { CompaniesTable, type CompanyRow } from './_components/companies-table';

export default async function HrCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission('hr:write');
  await ensureDefaultCompany();
  await connectDB();

  const query = parseDataTableQuery(await searchParams);
  const columns: Array<ColumnDef<CompanyRow>> = [
    {
      key: 'name',
      label: 'Név',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
    },
    {
      key: 'slug',
      label: 'Slug',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
    },
    { key: 'isActive', label: 'Aktív', type: 'boolean', sortable: true, filterable: true },
  ];
  const { filter, sort, skip, limit } = buildDataTableMongoQuery(query, columns);
  const [items, total] = await Promise.all([
    Company.find(filter).sort(sort).skip(skip).limit(limit).lean().exec(),
    Company.countDocuments(filter).exec(),
  ]);

  const data: CompanyRow[] = items.map((c) => ({
    _id: String(c._id),
    name: c.name,
    slug: c.slug,
    isActive: c.isActive,
  }));

  return (
    <Container className="flex max-w-4xl flex-col gap-3">
      <div>
        <h1 className="text-2xl font-bold">Cégek</h1>
        <p className="text-muted-foreground text-sm">
          Holdingon belüli cégek — egy dolgozó sor = egy céges tagság.
        </p>
      </div>
      <CompaniesTable data={data} columns={columns} query={query} total={total} />
    </Container>
  );
}
