import Link from 'next/link';
import { notFound } from 'next/navigation';
import { hasPermission, requirePermission } from '@crm/auth';
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
import { MovementActions } from '../../_components/movement-actions';

export default async function MovementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('logistics:read');
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

  const productMap = new Map(products.map((p) => [String(p._id), p.sku]));
  const warehouseMap = new Map(warehouses.map((w) => [String(w._id), w.name]));
  const canWrite = await hasPermission('logistics:write');

  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{movement.reference}</h1>
          <p className="text-muted-foreground text-sm capitalize">
            {movement.type} · {movement.status}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/logistics/movements">Back to list</Link>
        </Button>
      </div>

      {canWrite && <MovementActions id={id} status={movement.status} />}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          {movement.fromWarehouseId && (
            <p>
              <span className="text-muted-foreground">From:</span>{' '}
              {warehouseMap.get(String(movement.fromWarehouseId)) ??
                String(movement.fromWarehouseId)}
            </p>
          )}
          {movement.toWarehouseId && (
            <p>
              <span className="text-muted-foreground">To:</span>{' '}
              {warehouseMap.get(String(movement.toWarehouseId)) ?? String(movement.toWarehouseId)}
            </p>
          )}
          {movement.note && (
            <p>
              <span className="text-muted-foreground">Note:</span> {movement.note}
            </p>
          )}
          {movement.confirmedAt && (
            <p>
              <span className="text-muted-foreground">Confirmed:</span>{' '}
              {new Date(movement.confirmedAt).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lines</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movement.lines.map((line, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    {productMap.get(String(line.productId)) ?? String(line.productId)}
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
