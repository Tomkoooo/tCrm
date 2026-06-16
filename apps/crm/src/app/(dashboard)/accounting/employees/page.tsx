import { requireAnyPermission } from '@crm/auth';
import { connectDB } from '@crm/db';
import { buildCompanyFilter, listEmployeePersonGroups, listActiveCompanies } from '@crm/core';
import { HR_READ_PERMISSION_KEYS } from '@crm/lib';
import { Container, parseDataTableQuery, buildDataTableMongoQuery } from '@crm/ui';
import type { ColumnDef } from '@crm/ui';
import { hasPermission } from '@crm/auth';
import { getHrSessionScope } from '@/lib/hr/session-scope';
import { EmployeesTable, type EmployeeRow } from './_components/employees-table';

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAnyPermission([...HR_READ_PERMISSION_KEYS]);
  const { allowedCompanyIds } = await getHrSessionScope();
  const canWrite = await hasPermission('hr:write');
  await connectDB();

  const companies = await listActiveCompanies(allowedCompanyIds);
  const companyNameById = new Map(companies.map((c) => [String(c._id), c.name]));

  const query = parseDataTableQuery(await searchParams);
  const columns: Array<ColumnDef<EmployeeRow>> = [
    {
      key: 'name',
      label: 'Név',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
      mongoKey: 'name',
    },
    {
      key: 'companiesLabel',
      label: 'Cégek',
      type: 'string',
      sortable: false,
      filterable: false,
      searchable: false,
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
      key: 'department',
      label: 'Osztály',
      type: 'string',
      sortable: true,
      filterable: true,
    },
    {
      key: 'employmentType',
      label: 'Státusz',
      type: 'string',
      sortable: true,
      filterable: true,
    },
    {
      key: 'accountLabel',
      label: 'CRM fiók',
      type: 'string',
      sortable: false,
      filterable: false,
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

  const employmentFilter = filter.employmentType as { $regex?: string } | string | undefined;
  if (employmentFilter && typeof employmentFilter === 'object' && employmentFilter.$regex) {
    const label = employmentFilter.$regex.toLowerCase();
    if (label.includes('küls') || label.includes('vendég')) {
      filter.employmentType = 'guest';
    } else if (label.includes('alkalm')) {
      filter.employmentType = 'employee';
    }
  }

  const { groups, total } = await listEmployeePersonGroups({
    scopeFilter,
    matchFilter: filter,
    sort,
    skip,
    limit,
  });

  const data: EmployeeRow[] = groups.map((g) => {
    const companyNames = g.companyIds
      .map((id) => companyNameById.get(id))
      .filter(Boolean) as string[];
    return {
      _id: g.primaryEmployeeId,
      name: g.name,
      companiesLabel: companyNames.join(' · ') || '—',
      companyCount: companyNames.length,
      email: g.email,
      department: g.department,
      employmentType: g.employmentType === 'guest' ? 'Külsős' : 'Alkalmazott',
      isActive: g.isActive,
      hasUser: g.hasUser,
      accountLabel: g.hasUser ? 'Összekötve' : 'Nincs fiók',
    };
  });

  const companyOptions = companies.map((c) => ({
    _id: String(c._id),
    name: c.name,
  }));

  return (
    <Container className="flex max-w-6xl flex-col gap-3 md:gap-4">
      <div>
        <h1 className="text-2xl font-bold">Dolgozók</h1>
        <p className="text-muted-foreground text-sm">
          Egy sor = egy személy. Több cégnél a cégek felsorolva — beosztás és kimutatás továbbra is
          cégenként külön rekord. Részletek és fiók összekötés a közös adatlapon.
        </p>
      </div>
      <EmployeesTable
        data={data}
        columns={columns}
        query={query}
        total={total}
        canWrite={canWrite}
        companies={companyOptions}
      />
    </Container>
  );
}
