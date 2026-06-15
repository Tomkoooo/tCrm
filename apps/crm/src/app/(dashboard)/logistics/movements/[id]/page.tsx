import Link from 'next/link';
import { notFound } from 'next/navigation';
import { hasPermission, requireAnyPermission } from '@crm/auth';
import { LOGISTICS_READ_PERMISSION_KEYS } from '@crm/lib';
import { connectDB, Product, StockMovement, Warehouse } from '@crm/db';
import { Container } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ProductSkuLabel } from '@/components/product-sku-label';
import { MovementActions } from '../../_components/movement-actions';
import { MovementStatusLabel, MovementTypeLabel } from '../../_components/movement-labels';

export default async function MovementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAnyPermission([...LOGISTICS_READ_PERMISSION_KEYS]);
  await connectDB();

  const { id } = await params;
  const movement = await StockMovement.findById(id).lean().exec();
  if (!movement) notFound();

  const productIds = movement.lines.map((l) => l.productId);
  const warehouseIds = [
    movement.fromWarehouseId,
    movement.toWarehouseId,
    ...movement.lines.flatMap((l) => [l.fromWarehouseId, l.toWarehouseId]),
  ].filter((id): id is NonNullable<typeof id> => Boolean(id));

  const [products, warehouses] = await Promise.all([
    Product.find({ _id: { $in: productIds } })
      .select('sku names')
      .lean()
      .exec(),
    Warehouse.find({ _id: { $in: warehouseIds } })
      .select('key name')
      .lean()
      .exec(),
  ]);

  const productMap = new Map(products.map((p) => [String(p._id), p]));
  const warehouseMap = new Map(warehouses.map((w) => [String(w._id), w.name]));
  const canWrite = await hasPermission('logistics:write');

  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{movement.reference}</h1>
          <p className="text-muted-foreground text-sm">
            <MovementTypeLabel type={movement.type} /> ·{' '}
            <MovementStatusLabel status={movement.status} />
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/logistics/movements">Vissza a listához</Link>
        </Button>
      </div>

      {canWrite && <MovementActions id={id} status={movement.status} />}

      <Card>
        <CardHeader>
          <CardTitle>Részletek</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          {movement.fromWarehouseId && (
            <p>
              <span className="text-muted-foreground">Forrás:</span>{' '}
              {warehouseMap.get(String(movement.fromWarehouseId)) ??
                String(movement.fromWarehouseId)}
            </p>
          )}
          {movement.toWarehouseId && (
            <p>
              <span className="text-muted-foreground">Cél:</span>{' '}
              {warehouseMap.get(String(movement.toWarehouseId)) ?? String(movement.toWarehouseId)}
            </p>
          )}
          {movement.note && (
            <p>
              <span className="text-muted-foreground">Megjegyzés:</span> {movement.note}
            </p>
          )}
          {movement.confirmedAt && (
            <p>
              <span className="text-muted-foreground">Megerősítve:</span>{' '}
              {new Date(movement.confirmedAt).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tételek</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Termék</TableHead>
                <TableHead>Menny.</TableHead>
                <TableHead>Forrás</TableHead>
                <TableHead>Cél</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movement.lines.map((line, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    {(() => {
                      const p = productMap.get(String(line.productId));
                      if (!p) return String(line.productId);
                      return <ProductSkuLabel sku={p.sku} names={p.names} layout="stack" />;
                    })()}
                  </TableCell>
                  <TableCell>{line.quantity}</TableCell>
                  <TableCell>
                    {line.fromWarehouseId
                      ? (warehouseMap.get(String(line.fromWarehouseId)) ?? '—')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {line.toWarehouseId
                      ? (warehouseMap.get(String(line.toWarehouseId)) ?? '—')
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Container>
  );
}
