import Link from 'next/link';
import { ProductSkuLabel } from '@/components/product-sku-label';
import mongoose from 'mongoose';
import { requirePermission } from '@crm/auth';
import { getInventoryDashboardSummary } from '@crm/core';
import { Container } from '@crm/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  buildScopedProductFilter,
  getInventoryWarehouseScope,
} from '@/lib/inventory/warehouse-scope';
import { WarehouseFilter } from '../_components/warehouse-filter';

function formatHuf(n: number) {
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatEur(n: number) {
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function InventoryDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission('inventory:read');
  const rawParams = await searchParams;
  const warehouseIdParam =
    typeof rawParams.warehouseId === 'string' ? rawParams.warehouseId : undefined;
  const scope = await getInventoryWarehouseScope();
  const productFilter = await buildScopedProductFilter({ isActive: true }, warehouseIdParam);
  const warehouseIdsForStock = warehouseIdParam
    ? [new mongoose.Types.ObjectId(warehouseIdParam)]
    : scope.warehouseIds.length > 0
      ? scope.warehouseIds.map((id) => new mongoose.Types.ObjectId(id))
      : undefined;

  const summary = await getInventoryDashboardSummary({
    productFilter,
    warehouseIds: scope.isGlobal && !warehouseIdParam ? undefined : warehouseIdsForStock,
  });

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <h1 className="text-2xl font-bold">Termékmenedzsment</h1>
            <p className="text-muted-foreground text-sm">
              Készletérték, alacsony készlet, BOM építhetőség — raktár szerint szűrhető.
            </p>
          </div>
          <WarehouseFilter warehouses={scope.warehouses} selectedId={warehouseIdParam} />
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/inventory">Termékek</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Aktív termékek</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.productCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Készlet darabszám</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalOnHandUnits}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Készletérték (HUF)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHuf(summary.valuationHuf)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Készletérték (EUR)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatEur(summary.valuationEur)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alacsony készlet (≤5 szabad)</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.lowStockItems.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nincs kritikus tétel.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {summary.lowStockItems.map((item) => (
                  <li key={item.productId} className="flex justify-between gap-2 border-b pb-2">
                    <ProductSkuLabel
                      sku={item.sku}
                      name={item.name}
                      layout="stack"
                      href={`/inventory/${item.sku}`}
                    />
                    <span className="text-muted-foreground shrink-0">{item.available} szabad</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Összeszerelések — építhetőség</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.buildsAvailability.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nincs BOM termék.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {summary.buildsAvailability.map((b) => (
                  <li key={b.productId} className="flex justify-between gap-2 border-b pb-2">
                    <ProductSkuLabel
                      sku={b.sku}
                      name={b.name}
                      layout="stack"
                      href={`/inventory/${b.sku}`}
                    />
                    <span className="shrink-0">
                      {b.canBuild} db · {b.componentCount} alk.
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Beszállítók</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {summary.supplierBreakdown.map((s) => (
                <li key={s.supplierName} className="flex justify-between gap-2">
                  <span>{s.supplierName}</span>
                  <span className="text-muted-foreground">{s.productCount} termék</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Raktárak</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {summary.warehouseBreakdown.map((w) => (
                <li key={w.warehouseName} className="flex justify-between gap-2">
                  <span>{w.warehouseName}</span>
                  <span className="text-muted-foreground shrink-0 text-right">
                    {w.onHandUnits} db · {formatHuf(w.valuationHuf)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
