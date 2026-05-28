import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePermission } from '@crm/auth';
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

export default async function ProductDetailPage({ params }: { params: Promise<{ sku: string }> }) {
  await requirePermission('inventory:read');
  await connectDB();
  const { sku } = await params;

  const product = await Product.findOne({ sku }).lean().exec();
  if (!product) return notFound();

  const warehouses = await Warehouse.find({ isActive: true }).lean().exec();
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

  const name = product.names?.en ?? product.names?.hu ?? product.names?.de ?? product.sku;

  return (
    <Container className="flex max-w-6xl flex-col gap-4 pb-12 md:gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{name}</h1>
          <p className="text-muted-foreground text-sm">
            Internal SKU: {product.internalSku ?? '—'} · Manufacturer SKU: {product.sku}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/inventory">Back</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identification</CardTitle>
          <CardDescription>Primary identifiers</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <p className="text-muted-foreground text-xs">Brand</p>
            <p className="text-sm">{product.brand ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">EAN</p>
            <p className="text-sm">{product.ean ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Owner</p>
            <p className="text-sm">{product.owner ?? '—'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Names & descriptions</CardTitle>
          <CardDescription>DE / EN / HU</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <p className="text-muted-foreground text-xs">Name (DE)</p>
            <p className="text-sm">{product.names?.de ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Name (EN)</p>
            <p className="text-sm">{product.names?.en ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Name (HU)</p>
            <p className="text-sm">{product.names?.hu ?? '—'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Physical & package</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <p className="text-muted-foreground text-xs">Length</p>
            <p className="text-sm">{product.dimensionsMm?.length ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Width</p>
            <p className="text-sm">{product.dimensionsMm?.width ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Height</p>
            <p className="text-sm">{product.dimensionsMm?.height ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Weight</p>
            <p className="text-sm">{product.weightKg ?? '—'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-xs">Street price (HUF)</p>
            <p className="text-sm">{product.pricing?.streetPriceHuf ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Merchant price (HUF)</p>
            <p className="text-sm">{product.pricing?.merchantPriceHuf ?? '—'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stock by warehouse</CardTitle>
          <CardDescription>On-hand and reserved</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">On hand</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Available</TableHead>
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
          <CardTitle>Components (BOM)</CardTitle>
        </CardHeader>
        <CardContent>
          {(product.components?.length ?? 0) === 0 ? (
            <p className="text-muted-foreground text-sm">No components</p>
          ) : (
            <ul className="list-disc pl-5 text-sm">
              {(product.components as any[]).map((c, idx) => (
                <li key={idx}>
                  {String(c.productId)} × {c.quantity}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rental</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <p className="text-muted-foreground text-xs">Day</p>
            <p className="text-sm">{product.rental?.rentFeeDay ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Weekend</p>
            <p className="text-sm">{product.rental?.rentFeeWeekend ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Week</p>
            <p className="text-sm">{product.rental?.rentFeeWeek ?? '—'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent stock adjustments</CardTitle>
        </CardHeader>
        <CardContent>
          {adjustments.length === 0 ? (
            <p className="text-muted-foreground text-sm">No adjustments yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>At</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Delta</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Note</TableHead>
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
