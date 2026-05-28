import { hasPermission, requirePermission } from '@crm/auth';
import { getBulkAvailability, type BomAvailability } from '@crm/core';
import { connectDB, Product, Warehouse } from '@crm/db';
import Link from 'next/link';
import { Container } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BuildsTable, type BuildRow } from './_components/builds-table';

export default async function InventoryBuildsPage() {
  await requirePermission('inventory:read');
  await connectDB();

  const kits = await Product.find({
    isActive: true,
    'components.0': { $exists: true },
  })
    .sort({ sku: 1 })
    .lean()
    .exec();

  const kitIds = kits.map((k) => k._id);
  const availability: Map<string, BomAvailability> =
    kitIds.length > 0 ? await getBulkAvailability(kitIds) : new Map();

  const tableData: BuildRow[] = kits.map((kit) => ({
    sku: kit.sku,
    name: kit.names?.hu ?? kit.names?.en ?? kit.sku,
    componentCount: kit.components.length,
    canBuild: availability.get(String(kit._id))?.canBuild ?? 0,
  }));

  const warehouses = await Warehouse.find({ isActive: true }).sort({ name: 1 }).lean().exec();
  const canWrite = await hasPermission('inventory:write');

  return (
    <Container className="flex max-w-6xl flex-col gap-3 md:gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Összeszerelések (BOM)</h1>
          <p className="text-muted-foreground text-sm">
            Ajánlható db = min(komponens szabad / szükséges mennyiség) az összes raktár alapján.
          </p>
        </div>
        {canWrite && (
          <Button asChild>
            <Link href="/inventory/builds/new">Új összeszerelés</Link>
          </Button>
        )}
      </div>

      <BuildsTable data={tableData} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Raktárak</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          {warehouses.map((w) => w.name).join(' · ') || '—'} — részletes készlet a termék oldalon.
        </CardContent>
      </Card>
    </Container>
  );
}
