import Link from 'next/link';
import { requirePermission } from '@crm/auth';
import { connectDB, StockMovement } from '@crm/db';
import { Container, parseDataTableQuery, buildDataTableMongoQuery } from '@crm/ui';
import type { ColumnDef } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { MovementsTable, type MovementRow } from './_components/movements-table';

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission('logistics:read');
  await connectDB();

  const query = parseDataTableQuery(await searchParams);
  const columns: Array<ColumnDef<MovementRow>> = [
    {
      key: 'reference',
      label: 'Hivatkozás',
      type: 'string',
      sortable: true,
      filterable: true,
      searchable: true,
    },
    { key: 'type', label: 'Típus', type: 'string', sortable: true, filterable: true },
    { key: 'status', label: 'Státusz', type: 'string', sortable: true, filterable: true },
    { key: 'lineCount', label: 'Sorok', type: 'number', sortable: true },
    { key: 'createdAt', label: 'Létrehozva', type: 'date', sortable: true },
  ];

  const { filter, sort, skip, limit } = buildDataTableMongoQuery(query, columns);
  const [items, total] = await Promise.all([
    StockMovement.find(filter).sort(sort).skip(skip).limit(limit).lean().exec(),
    StockMovement.countDocuments(filter).exec(),
  ]);

  const typeLabels: Record<string, string> = {
    grn: 'Bevételezés',
    pick: 'Kiadás',
    transfer: 'Raktárközi',
    return: 'Visszáru',
    adjustment: 'Korrekció',
  };
  const statusLabels: Record<string, string> = {
    draft: 'Tervezet',
    confirmed: 'Megerősítve',
    cancelled: 'Elutasítva',
  };

  const data: MovementRow[] = items.map((m) => ({
    _id: String(m._id),
    reference: m.reference,
    type: typeLabels[m.type] ?? m.type,
    status: statusLabels[m.status] ?? m.status,
    lineCount: m.lines?.length ?? 0,
    createdAt: m.createdAt,
  }));

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Készletmozgások</h1>
          <p className="text-muted-foreground text-sm">
            Bevételezés, kiadás, raktárközi átadás és visszáru.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/logistics">Logisztika</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/logistics/movements/new/grn">Új bevételezés</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href="/logistics/movements/new/pick">Új kiadás</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href="/logistics/movements/new/transfer">Új átadás</Link>
          </Button>
        </div>
      </div>

      <MovementsTable data={data} columns={columns} query={query} total={total} />
    </Container>
  );
}
