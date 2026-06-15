import { requireAnyPermission } from '@crm/auth';
import { connectDB, Employee } from '@crm/db';
import { buildCompanyFilter } from '@crm/core';
import { HR_READ_PERMISSION_KEYS } from '@crm/lib';
import { Container, parseDataTableQuery, buildDataTableMongoQuery } from '@crm/ui';
import type { ColumnDef } from '@crm/ui';
import { hasPermission } from '@crm/auth';
import { listActiveCompanies } from '@crm/core';
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
      key: 'companyName',
      label: 'Cég',
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
  const mergedFilter = { ...filter, ...scopeFilter };

  const [items, total] = await Promise.all([
    Employee.find(mergedFilter).sort(sort).skip(skip).limit(limit).lean().exec(),
    Employee.countDocuments(mergedFilter).exec(),
  ]);

  const data: EmployeeRow[] = items.map((e) => ({
    _id: String(e._id),
    name: e.name,
    companyName: companyNameById.get(String(e.companyId)) ?? '—',
    email: e.email,
    department: e.department,
    employmentType: e.employmentType === 'guest' ? 'Külsős' : 'Alkalmazott',
    isActive: e.isActive,
    hasUser: Boolean(e.userId),
    accountLabel: e.userId ? 'Összekötve' : 'Nincs fiók',
  }));

  const companyOptions = companies.map((c) => ({
    _id: String(c._id),
    name: c.name,
  }));

  return (
    <Container className="flex max-w-6xl flex-col gap-3 md:gap-4">
      <div>
        <h1 className="text-2xl font-bold">Dolgozók</h1>
        <p className="text-muted-foreground text-sm">
          Dolgozói rekordok cégenként — egy személy több cégnél külön beosztás, szabadság és
          kimutatás. CRM fiók összekötés és másik céghez adás a részleteknél.
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
