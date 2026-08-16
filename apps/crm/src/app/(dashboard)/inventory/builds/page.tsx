import { hasPermission, requirePermission } from '@crm/auth';
import { getBulkAvailability, type BomAvailability } from '@crm/inventory';
import { connectDB, Product } from '@crm/db-core';
import Link from 'next/link';
import { Container } from '@crm/ui';
import { Button } from '@crm/ui';
import { BuildsTable, type BuildRow } from './_components/builds-table';
import {
  buildScopedProductFilter,
  getInventoryWarehouseScope,
} from '@/lib/inventory/warehouse-scope';
import { WarehouseFilter } from '../_components/warehouse-filter';

export default async function InventoryBuildsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission('inventory:read');
  await connectDB();

  const rawParams = await searchParams;
  const warehouseIdParam =
    typeof rawParams.warehouseId === 'string' ? rawParams.warehouseId : undefined;
  const scope = await getInventoryWarehouseScope();
  const listFilter = await buildScopedProductFilter(
    { isActive: true, 'components.0': { $exists: true } },
    warehouseIdParam
  );

  const kits = await Product.find(listFilter).sort({ sku: 1 }).lean().exec();

  const kitIds = kits.map((k) => k._id);
  const availability: Map<string, BomAvailability> =
    kitIds.length > 0 ? await getBulkAvailability(kitIds) : new Map();

  const tableData: BuildRow[] = kits.map((kit) => ({
    sku: kit.sku,
    name: kit.names?.hu ?? kit.names?.en ?? kit.sku,
    componentCount: kit.components.length,
    canBuild: availability.get(String(kit._id))?.canBuild ?? 0,
  }));

  const canWrite = await hasPermission('inventory:write');

  return (
    <Container className="flex max-w-6xl flex-col gap-3 md:gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <h1 className="text-2xl font-bold">Összeszerelések (BOM)</h1>
            <p className="text-muted-foreground text-sm">
              Csak a kiválasztott raktárhoz rendelt összeszerelések (crm_warehouse_slug).
            </p>
          </div>
          <WarehouseFilter warehouses={scope.warehouses} selectedId={warehouseIdParam} />
        </div>
        {canWrite && (
          <Button asChild>
            <Link href="/inventory/builds/new">Új összeszerelés</Link>
          </Button>
        )}
      </div>

      <BuildsTable data={tableData} canWrite={canWrite} />
    </Container>
  );
}
