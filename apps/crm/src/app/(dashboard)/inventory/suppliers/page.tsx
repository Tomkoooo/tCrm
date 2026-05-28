import { hasPermission, requirePermission } from '@crm/auth';
import { connectDB, Supplier } from '@crm/db';
import { Container, parseDataTableQuery, buildDataTableMongoQuery } from '@crm/ui';
import type { ColumnDef } from '@crm/ui';
import { SuppliersTable, type SupplierRow } from './_components/suppliers-table';

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission('suppliers:read');
  await connectDB();

  const canManage = await hasPermission('suppliers:manage');
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
      label: 'Név',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
    },
    { key: 'city', label: 'Város', type: 'string', sortable: true, filterable: true },
    { key: 'country', label: 'Ország', type: 'string', sortable: true, filterable: true },
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
  }));

  return (
    <Container className="flex max-w-6xl flex-col gap-3 md:gap-4">
      <div>
        <h1 className="text-2xl font-bold">Beszállítók</h1>
        <p className="text-muted-foreground text-sm">
          Partner felvétel — Excel <strong>crm_supplier_slug</strong> = <strong>kulcs</strong>.
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
