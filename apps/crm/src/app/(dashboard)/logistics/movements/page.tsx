import Link from 'next/link';
import { requirePermission } from '@crm/auth';
import { connectDB, StockMovement } from '@crm/db';
import { Container, DataTable, parseDataTableQuery, buildDataTableMongoQuery } from '@crm/ui';
import type { ColumnDef } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Row = {
  _id: string;
  reference: string;
  type: string;
  status: string;
  lineCount: number;
  createdAt: Date;
};

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission('logistics:read');
  await connectDB();

  const query = parseDataTableQuery(await searchParams);
  const columns: Array<ColumnDef<Row>> = [
    {
      key: 'reference',
      label: 'Reference',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
    },
    { key: 'type', label: 'Type', type: 'string', sortable: true, filterable: true },
    { key: 'status', label: 'Status', type: 'string', sortable: true, filterable: true },
    { key: 'lineCount', label: 'Lines', type: 'number', sortable: true },
    { key: 'createdAt', label: 'Created', type: 'date', sortable: true },
  ];

  const { filter, sort, skip, limit } = buildDataTableMongoQuery(query, columns);
  const [items, total] = await Promise.all([
    StockMovement.find(filter).sort(sort).skip(skip).limit(limit).lean().exec(),
    StockMovement.countDocuments(filter).exec(),
  ]);

  const data: Row[] = items.map((m) => ({
    _id: String(m._id),
    reference: m.reference,
    type: m.type,
    status: m.status,
    lineCount: m.lines?.length ?? 0,
    createdAt: m.createdAt,
  }));

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stock movements</h1>
          <p className="text-muted-foreground text-sm">GRN, pick lists, transfers, and returns.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/logistics">Dashboard</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/logistics/movements/new/grn">New GRN</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href="/logistics/movements/new/pick">New pick</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href="/logistics/movements/new/transfer">New transfer</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All movements</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<Row>
            data={data}
            columns={columns}
            query={query}
            total={total}
            basePath="/logistics/movements"
            rowHref={(row) => `/logistics/movements/${row._id}`}
            emptyMessage="No movements yet."
          />
        </CardContent>
      </Card>
    </Container>
  );
}
