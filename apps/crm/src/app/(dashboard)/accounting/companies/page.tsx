import { requirePermission } from '@crm/auth';
import { connectDB, Company } from '@crm/db';
import { buildCompanyIdFilter } from '@crm/core';
import { Container, parseDataTableQuery, buildDataTableMongoQuery } from '@crm/ui';
import type { ColumnDef } from '@crm/ui';
import { getHrSessionScope } from '@/lib/hr/session-scope';
import { CompaniesTable, type CompanyRow } from './_components/companies-table';

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission('hr:write');
  const { allowedCompanyIds } = await getHrSessionScope();
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
    {
      key: 'isActive',
      label: 'Aktív',
      type: 'boolean',
      sortable: true,
      filterable: true,
    },
  ];

  const scopeFilter = buildCompanyIdFilter(allowedCompanyIds);
  const { filter, sort, skip, limit } = buildDataTableMongoQuery(query, columns);
  const mergedFilter = { ...filter, ...scopeFilter };

  const [items, total, allCompanies] = await Promise.all([
    Company.find(mergedFilter).sort(sort).skip(skip).limit(limit).lean().exec(),
    Company.countDocuments(mergedFilter).exec(),
    Company.find({ isActive: true }).sort({ name: 1 }).select({ name: 1 }).lean().exec(),
  ]);

  const parentNameById = new Map(allCompanies.map((c) => [String(c._id), c.name]));

  const data: CompanyRow[] = items.map((c) => ({
    _id: String(c._id),
    name: c.name,
    slug: c.slug,
    parentName: c.parentCompanyId ? parentNameById.get(String(c.parentCompanyId)) : undefined,
    isActive: c.isActive,
  }));

  const parentOptions = allCompanies.map((c) => ({
    _id: String(c._id),
    name: c.name,
  }));

  return (
    <Container className="flex max-w-6xl flex-col gap-3 md:gap-4">
      <div>
        <h1 className="text-2xl font-bold">Cégek</h1>
        <p className="text-muted-foreground text-sm">Csoportcég és leányvállalatok.</p>
      </div>
      <CompaniesTable
        data={data}
        columns={columns}
        query={query}
        total={total}
        parentCompanies={parentOptions}
      />
    </Container>
  );
}
