import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePermission } from '@crm/auth';
import { calculateBomAvailability } from '@crm/core';
import { connectDB, Product, StockAdjustment, StockLevel, Warehouse } from '@crm/db';
import { Container } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EnDeReadonlyDetails } from '@/components/en-de-readonly-details';
import { resolveProductImageUrls } from '@/lib/product-thumbnail';
import {
  buildStockSummariesForProducts,
  toRelationCard,
  type ProductRelationsData,
} from '@/lib/inventory/product-relations';
import {
  canAccessProductWarehouses,
  getInventoryWarehouseScope,
} from '@/lib/inventory/warehouse-scope';
import { ProductRelationsMap } from '../_components/product-relations-map';

export default async function ProductDetailPage({ params }: { params: Promise<{ sku: string }> }) {
  await requirePermission('inventory:read');
  await connectDB();
  const { sku } = await params;

  const product = await Product.findOne({ sku }).lean().exec();
  if (!product) return notFound();

  const allowed = await canAccessProductWarehouses(
    (product.warehouseIds ?? []).map((id) => String(id))
  );
  if (!allowed) return notFound();

  const scope = await getInventoryWarehouseScope();
  const warehouseQuery =
    scope.isGlobal || !scope.warehouseIds.length
      ? { isActive: true }
      : { _id: { $in: scope.warehouseIds }, isActive: true };

  const warehouses = await Warehouse.find(warehouseQuery).lean().exec();
  const warehouseNameById = new Map(warehouses.map((w) => [String(w._id), w.name]));
  const scopeWarehouseIds =
    scope.isGlobal || !scope.warehouseIds.length ? undefined : scope.warehouseIds;

  const stock = await StockLevel.find({ productId: product._id }).lean().exec();
  const adjustments = await StockAdjustment.find({ productId: product._id })
    .sort({ at: -1 })
    .limit(10)
    .lean()
    .exec();

  const stockByWarehouse = new Map<string, { onHand: number; reserved: number }>();
  for (const s of stock as any[]) {
    stockByWarehouse.set(String(s.warehouseId), {
      onHand: s.onHand ?? 0,
      reserved: s.reserved ?? 0,
    });
  }

  const name = product.names?.hu ?? product.names?.en ?? product.names?.de ?? product.sku;
  const imageUrls = resolveProductImageUrls(product);

  const componentIds = product.components?.map((c) => c.productId) ?? [];
  const parentProducts = await Product.find({ 'components.productId': product._id })
    .select({ sku: 1, names: 1, imageIds: 1, externalImageHints: 1, components: 1 })
    .lean()
    .exec();
  const componentProducts = await Product.find({ _id: { $in: componentIds } })
    .select({ sku: 1, names: 1, imageIds: 1, externalImageHints: 1 })
    .lean()
    .exec();

  const relationProductIds = [product._id, ...componentIds, ...parentProducts.map((p) => p._id)];
  const stockSummaries = await buildStockSummariesForProducts(
    relationProductIds,
    warehouseNameById,
    scopeWarehouseIds
  );

  const componentById = new Map(
    componentProducts.map((p) => [
      String(p._id),
      { sku: p.sku, name: p.names?.hu ?? p.names?.en ?? p.sku, product: p },
    ])
  );

  const bomAvail =
    (product.components?.length ?? 0) > 0 ? await calculateBomAvailability(product._id) : null;

  const availabilityByComponentId = new Map(
    (bomAvail?.limitingComponents ?? []).map((line) => [String(line.productId), line.available])
  );

  const relationsData: ProductRelationsData = {
    center: toRelationCard(product, stockSummaries),
    parents: parentProducts.map((parent) => {
      const line = parent.components?.find((c) => String(c.productId) === String(product._id));
      return {
        ...toRelationCard(parent, stockSummaries),
        quantity: line?.quantity ?? 1,
      };
    }),
    components: (product.components ?? []).map((line) => {
      const comp = componentById.get(String(line.productId));
      const compProduct = comp?.product;
      return {
        sku: comp?.sku ?? '—',
        name: comp?.name ?? '—',
        thumbnailUrl: compProduct
          ? toRelationCard(compProduct, stockSummaries).thumbnailUrl
          : undefined,
        stockSummary: compProduct ? stockSummaries.get(String(compProduct._id)) : undefined,
        quantity: line.quantity,
        available: availabilityByComponentId.get(String(line.productId)),
      };
    }),
    canBuild: bomAvail?.canBuild,
  };

  return (
    <Container className="flex max-w-6xl flex-col gap-4 pb-12 md:gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{name}</h1>
          <p className="text-muted-foreground font-mono text-sm">CRM SKU: {product.sku}</p>
        </div>
        <div className="flex gap-2">
          {(product.components?.length ?? 0) > 0 && (
            <Button asChild variant="secondary" size="sm">
              <Link href="/inventory/builds">Összeszerelések</Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href="/inventory">Vissza</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Azonosítók</CardTitle>
          <CardDescription>Három külön cikkszám-típus</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="md:col-span-2">
            <p className="text-muted-foreground text-xs">
              CRM SKU (kategória előtag + beszállítói)
            </p>
            <p className="font-mono text-sm font-medium">{product.sku}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Beszállítói SKU</p>
            <p className="font-mono text-sm">{product.supplierSku ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Beszállítói cikkszám (supplierNo)</p>
            <p className="text-sm">{product.supplierNo ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Márka</p>
            <p className="text-sm">{product.brand ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">EAN</p>
            <p className="text-sm">{product.ean ?? '—'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Termék kapcsolatok</CardTitle>
          <CardDescription>
            A jelenlegi termék felül; lefelé az alkatrészek (ebből épül fel), alatta az
            összeszerelések (amelyekbe beépül). A szám = hány db kell belőle egy összeszereléshez.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductRelationsMap data={relationsData} />
        </CardContent>
      </Card>

      {imageUrls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Képek</CardTitle>
            <CardDescription>
              Médiatár ({product.imageIds?.length ?? 0} csatolva
              {(product.externalImageHints?.length ?? 0) > 0 ? ', Excel hintek is' : ''})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {imageUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block overflow-hidden rounded-md border"
                >
                  <img src={url} alt={`${name} — ${i + 1}`} className="size-32 object-cover" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Nevek és leírások</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="text-muted-foreground text-xs">Név (HU)</p>
            <p className="text-sm">{product.names?.hu ?? '—'}</p>
          </div>
          {(product.descriptions?.hu || product.descriptions?.en || product.descriptions?.de) && (
            <div>
              <p className="text-muted-foreground text-xs">Leírás (HU)</p>
              <p className="whitespace-pre-wrap text-sm">{product.descriptions?.hu ?? '—'}</p>
            </div>
          )}
          {(product.names?.en ||
            product.names?.de ||
            product.descriptions?.en ||
            product.descriptions?.de) && (
            <EnDeReadonlyDetails>
              {(product.names?.en || product.names?.de) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground text-xs">Név (EN)</p>
                    <p className="text-sm">{product.names?.en ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Név (DE)</p>
                    <p className="text-sm">{product.names?.de ?? '—'}</p>
                  </div>
                </div>
              )}
              {(product.descriptions?.en || product.descriptions?.de) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground text-xs">Leírás (EN)</p>
                    <p className="whitespace-pre-wrap text-sm">{product.descriptions?.en ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Leírás (DE)</p>
                    <p className="whitespace-pre-wrap text-sm">{product.descriptions?.de ?? '—'}</p>
                  </div>
                </div>
              )}
            </EnDeReadonlyDetails>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Méretek és csomag</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <p className="text-muted-foreground text-xs">Hossz</p>
            <p className="text-sm">{product.dimensionsMm?.length ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Szélesség</p>
            <p className="text-sm">{product.dimensionsMm?.width ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Magasság</p>
            <p className="text-sm">{product.dimensionsMm?.height ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Súly</p>
            <p className="text-sm">{product.weightKg ?? '—'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Árazás</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-xs">Utcaár (HUF)</p>
            <p className="text-sm">{product.pricing?.streetPriceHuf ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Viszonteladói ár (HUF)</p>
            <p className="text-sm">{product.pricing?.merchantPriceHuf ?? '—'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Készlet raktáronként</CardTitle>
          <CardDescription>Kézi + foglalt = szabad (ajánlható)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Raktár</TableHead>
                <TableHead className="text-right">Kézi</TableHead>
                <TableHead className="text-right">Foglalt</TableHead>
                <TableHead className="text-right">Szabad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehouses.map((w: any) => {
                const s = stockByWarehouse.get(String(w._id)) ?? { onHand: 0, reserved: 0 };
                return (
                  <TableRow key={String(w._id)}>
                    <TableCell>{w.name}</TableCell>
                    <TableCell className="text-right">{s.onHand}</TableCell>
                    <TableCell className="text-right">{s.reserved}</TableCell>
                    <TableCell className="text-right">{s.onHand - s.reserved}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Összeszerelés (BOM)</CardTitle>
          {bomAvail && (
            <CardDescription>
              Összesen ajánlható ebből az összeszerelésből: <strong>{bomAvail.canBuild}</strong> db
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {(product.components?.length ?? 0) === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nincs alkatrészlista — egyszerű termék, nem összeszerelés.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alkatrész CRM SKU</TableHead>
                  <TableHead>Név</TableHead>
                  <TableHead className="text-right">/db</TableHead>
                  <TableHead className="text-right">Szabad készlet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.components.map((c, idx) => {
                  const comp = componentById.get(String(c.productId));
                  const line = bomAvail?.limitingComponents.find(
                    (l) => String(l.productId) === String(c.productId)
                  );
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs">
                        {comp?.sku ? (
                          <Link
                            href={`/inventory/${encodeURIComponent(comp.sku)}`}
                            className="text-primary hover:underline"
                          >
                            {comp.sku}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>{comp?.name ?? '—'}</TableCell>
                      <TableCell className="text-right">{c.quantity}</TableCell>
                      <TableCell className="text-right">{line?.available ?? '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {product.assemblyGuide && (
        <Card>
          <CardHeader>
            <CardTitle>Összeszerelési útmutató</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm">{product.assemblyGuide}</pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Bérlés</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <p className="text-muted-foreground text-xs">Nap</p>
            <p className="text-sm">{product.rental?.rentFeeDay ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Hétvége</p>
            <p className="text-sm">{product.rental?.rentFeeWeekend ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Hét</p>
            <p className="text-sm">{product.rental?.rentFeeWeek ?? '—'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Utolsó készletmódosítások</CardTitle>
        </CardHeader>
        <CardContent>
          {adjustments.length === 0 ? (
            <p className="text-muted-foreground text-sm">Még nincs módosítás.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Időpont</TableHead>
                  <TableHead>Raktár</TableHead>
                  <TableHead className="text-right">Változás</TableHead>
                  <TableHead>Ok</TableHead>
                  <TableHead>Megjegyzés</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(adjustments as any[]).map((a) => (
                  <TableRow key={String(a._id)}>
                    <TableCell>{new Date(a.at).toLocaleString()}</TableCell>
                    <TableCell>{String(a.warehouseId)}</TableCell>
                    <TableCell className="text-right">{a.delta}</TableCell>
                    <TableCell>{a.reason}</TableCell>
                    <TableCell>{a.note ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
