import { requireAnyPermission } from '@crm/auth';
import { connectDB, Team, Employee, Company } from '@crm/db';
import { buildCompanyFilter, listActiveCompanies } from '@crm/core';
import { Container, parseDataTableQuery, buildDataTableMongoQuery } from '@crm/ui';
import type { ColumnDef } from '@crm/ui';
import { getHrSessionScope } from '@/lib/hr/session-scope';
import { TeamsTable, type TeamRow } from './_components/teams-table';

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAnyPermission(['hr:write', 'hr:teams:write']);
  const { allowedCompanyIds } = await getHrSessionScope();
  await connectDB();

  const query = parseDataTableQuery(await searchParams);
  const columns: Array<ColumnDef<TeamRow>> = [
    {
      key: 'name',
      label: 'Név',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
    },
    {
      key: 'companyName',
      label: 'Cég',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
      mongoKey: 'companyId',
    },
    {
      key: 'leaderName',
      label: 'Vezető',
      type: 'string',
      sortable: false,
      filterable: false,
    },
    {
      key: 'memberCount',
      label: 'Tagok',
      type: 'number',
      sortable: false,
    },
    {
      key: 'isActive',
      label: 'Aktív',
      type: 'boolean',
      sortable: true,
      filterable: true,
    },
  ];

  const scopeFilter = buildCompanyFilter(allowedCompanyIds);
  const { filter, sort, skip, limit } = buildDataTableMongoQuery(query, columns);
  const mergedFilter = { ...filter, ...scopeFilter };

  const [items, total, companies] = await Promise.all([
    Team.find(mergedFilter).sort(sort).skip(skip).limit(limit).lean().exec(),
    Team.countDocuments(mergedFilter).exec(),
    listActiveCompanies(allowedCompanyIds),
  ]);

  const companyIds = [...new Set(items.map((t) => String(t.companyId)))];
  const leaderIds = [...new Set(items.map((t) => String(t.leaderEmployeeId)))];

  const [companyDocs, leaderDocs] = await Promise.all([
    Company.find({ _id: { $in: companyIds } })
      .select({ name: 1 })
      .lean()
      .exec(),
    Employee.find({ _id: { $in: leaderIds } })
      .select({ name: 1 })
      .lean()
      .exec(),
  ]);

  const companyNameById = new Map(companyDocs.map((c) => [String(c._id), c.name]));
  const leaderNameById = new Map(leaderDocs.map((e) => [String(e._id), e.name]));

  const data: TeamRow[] = items.map((t) => ({
    _id: String(t._id),
    name: t.name,
    slug: t.slug,
    companyName: companyNameById.get(String(t.companyId)) ?? '—',
    leaderName: leaderNameById.get(String(t.leaderEmployeeId)) ?? '—',
    memberCount: t.memberEmployeeIds?.length ?? 0,
    teamType: t.teamType,
    isActive: t.isActive,
  }));

  return (
    <Container className="flex max-w-6xl flex-col gap-3 md:gap-4">
      <div>
        <h1 className="text-2xl font-bold">Csapatok</h1>
        <p className="text-muted-foreground text-sm">
          Építő- és szállítócsapatok vezetővel — a vezető szerkesztheti a tagok beosztását.
        </p>
      </div>
      <TeamsTable
        data={data}
        columns={columns}
        query={query}
        total={total}
        companies={companies.map((c) => ({ _id: String(c._id), name: c.name }))}
      />
    </Container>
  );
}
