import Link from 'next/link';
import { hasPermission, requireAnyPermission } from '@crm/auth';
import { connectDB, Employee, Company } from '@crm/db-core';
import { ensureDefaultCompany, listCompanies, HR_READ_PERMISSION_KEYS } from '@crm/hr';
import { Container, parseDataTableQuery, buildDataTableMongoQuery } from '@crm/ui';
import type { ColumnDef } from '@crm/ui';
import { PeopleTable, type PeopleRow } from './_components/people-table';

export default async function HrPeoplePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAnyPermission([...HR_READ_PERMISSION_KEYS]);
  await ensureDefaultCompany();
  await connectDB();
  const canWrite = await hasPermission('hr:write');
  const sp = await searchParams;
  const companyId = typeof sp.companyId === 'string' ? sp.companyId : undefined;

  const companies = await listCompanies({ activeOnly: true });
  const query = parseDataTableQuery(sp);
  const columns: Array<ColumnDef<PeopleRow>> = [
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
      sortable: false,
      filterable: false,
    },
    {
      key: 'email',
      label: 'E-mail',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
    },
    {
      key: 'scheduleMode',
      label: 'Mód',
      type: 'string',
      sortable: true,
      filterable: true,
    },
    { key: 'isActive', label: 'Aktív', type: 'boolean', sortable: true, filterable: true },
    { key: 'hasLogin', label: 'CRM fiók', type: 'boolean', sortable: false, filterable: true },
  ];

  const { filter, sort, skip, limit } = buildDataTableMongoQuery(query, columns);
  const mongoFilter: Record<string, unknown> = { ...filter };
  delete mongoFilter.companyName;
  delete mongoFilter.hasLogin;
  if (companyId) mongoFilter.companyId = companyId;
  if ('hasLogin' in filter) {
    const want = (filter as { hasLogin?: boolean }).hasLogin;
    if (want === true) mongoFilter.userId = { $exists: true, $ne: null };
    if (want === false) {
      mongoFilter.$or = [{ userId: { $exists: false } }, { userId: null }];
    }
  }

  const [items, total] = await Promise.all([
    Employee.find(mongoFilter).sort(sort).skip(skip).limit(limit).lean().exec(),
    Employee.countDocuments(mongoFilter).exec(),
  ]);

  const companyMap = new Map(
    (
      await Company.find({ _id: { $in: items.map((e) => e.companyId) } })
        .select({ name: 1 })
        .lean()
        .exec()
    ).map((c) => [String(c._id), c.name])
  );

  const data: PeopleRow[] = items.map((e) => ({
    _id: String(e._id),
    name: e.name,
    email: e.email,
    phone: e.phone,
    companyName: companyMap.get(String(e.companyId)) ?? '—',
    scheduleMode: e.scheduleMode === 'roster' ? 'roster' : 'logistics',
    isActive: e.isActive,
    hasLogin: Boolean(e.userId),
  }));

  const companyOptions = companies.map((c) => ({ id: String(c._id), name: c.name }));

  return (
    <Container className="flex max-w-6xl flex-col gap-3 md:gap-4">
      <div>
        <h1 className="text-2xl font-bold">Dolgozók</h1>
        <p className="text-muted-foreground text-sm">
          Egy sor = egy céges tagság. Logisztika vagy roster mód.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href="/hr/people"
          className={!companyId ? 'font-medium underline' : 'text-muted-foreground'}
        >
          Összes cég
        </Link>
        {companyOptions.map((c) => (
          <Link
            key={c.id}
            href={`/hr/people?companyId=${c.id}`}
            className={companyId === c.id ? 'font-medium underline' : 'text-muted-foreground'}
          >
            {c.name}
          </Link>
        ))}
      </div>
      <PeopleTable
        data={data}
        columns={columns}
        query={query}
        total={total}
        canWrite={canWrite}
        companies={companyOptions}
        defaultCompanyId={companyId ?? companyOptions[0]?.id}
      />
    </Container>
  );
}
