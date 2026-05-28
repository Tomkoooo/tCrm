import { hasAnyPermission, requireAnyPermission } from '@crm/auth';
import { connectDB, Supplier } from '@crm/db';
import {
  SUPPLIER_MANAGE_PERMISSION_KEYS,
  SUPPLIER_READ_PERMISSION_KEYS,
  primarySalesContactName,
} from '@crm/lib';
import { Container, parseDataTableQuery, buildDataTableMongoQuery } from '@crm/ui';
import type { ColumnDef } from '@crm/ui';
import { SuppliersTable, type SupplierRow } from './_components/suppliers-table';

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAnyPermission([...SUPPLIER_READ_PERMISSION_KEYS]);
  await connectDB();

  const canManage = await hasAnyPermission([...SUPPLIER_MANAGE_PERMISSION_KEYS]);
  const query = parseDataTableQuery(await searchParams);
  const columns: Array<ColumnDef<SupplierRow>> = [
    {
      key: 'key',
      label: 'Kulcs',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
    },
    {
      key: 'name',
      label: 'Cégnév',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
    },
    {
      key: 'city',
      label: 'Város',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
    },
    {
      key: 'phone',
      label: 'Telefon',
      type: 'string',
      sortable: false,
      filterable: false,
      defaultVisible: true,
    },
    {
      key: 'email',
      label: 'E-mail',
      type: 'string',
      sortable: false,
      filterable: false,
      defaultVisible: true,
    },
    {
      key: 'salesContact',
      label: 'Értékesítő',
      type: 'string',
      sortable: false,
      filterable: false,
      defaultVisible: true,
    },
    {
      key: 'euTaxNo',
      label: 'EU adószám',
      type: 'string',
      sortable: false,
      filterable: false,
      defaultVisible: false,
    },
  ];

  const { filter, sort, skip, limit } = buildDataTableMongoQuery(query, columns);
  const [items, total] = await Promise.all([
    Supplier.find(filter).sort(sort).skip(skip).limit(limit).lean().exec(),
    Supplier.countDocuments(filter).exec(),
  ]);

  const data: SupplierRow[] = items.map((s) => ({
    _id: String(s._id),
    key: s.key,
    name: s.name,
    city: s.city,
    country: s.country,
    phone: s.phone,
    email: s.email,
    euTaxNo: s.euTaxNo,
    salesContact: primarySalesContactName(s.contacts),
  }));

  return (
    <Container className="flex max-w-6xl flex-col gap-3 md:gap-4">
      <div>
        <h1 className="text-2xl font-bold">Beszállítók</h1>
        <p className="text-muted-foreground text-sm">
          Cégadatok és elnevezett kapcsolattartók. Import: <strong>crm_supplier_slug</strong> ={' '}
          <strong>kulcs</strong>.
        </p>
      </div>

      <SuppliersTable
        data={data}
        columns={columns}
        query={query}
        total={total}
        canManage={canManage}
      />
    </Container>
  );
}
