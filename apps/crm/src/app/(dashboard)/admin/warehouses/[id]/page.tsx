import Link from 'next/link';
import { notFound } from 'next/navigation';
import { hasPermission, requirePermission } from '@crm/auth';
import { connectDB, Product, StockLevel, Warehouse } from '@crm/db';
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
import { EditWarehouseForm } from '../_components/edit-warehouse-form';

export default async function WarehouseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('warehouses:read');
  await connectDB();
  const { id } = await params;

  const warehouse = await Warehouse.findById(id).lean().exec();
  if (!warehouse) return notFound();

  const levels = await StockLevel.find({ warehouseId: warehouse._id })
    .sort({ onHand: -1 })
    .limit(50)
    .lean()
    .exec();

  const productIds = levels.map((l) => l.productId);
  const products = await Product.find({ _id: { $in: productIds } })
    .select('sku names internalSku')
    .lean()
    .exec();
  const productMap = new Map(
    products.map((p) => [
      String(p._id),
      {
        sku: p.sku,
        name: p.names?.hu ?? p.names?.en ?? p.sku,
        internalSku: p.internalSku,
      },
    ])
  );

  const canManage = await hasPermission('warehouses:manage');

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{warehouse.name}</h1>
          <p className="text-muted-foreground text-sm">Kulcs: {warehouse.key}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/warehouses">Vissza a listához</Link>
        </Button>
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Raktár szerkesztése</CardTitle>
          </CardHeader>
          <CardContent>
            <EditWarehouseForm
              id={id}
              initial={{
                key: warehouse.key,
                name: warehouse.name,
                address: warehouse.address ?? '',
                isActive: Boolean(warehouse.isActive),
                assignedUserIds: (warehouse.assignedUserIds ?? []).map((id) => String(id)),
              }}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Készletszintek (top 50)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Termék</TableHead>
                <TableHead className="text-right">Készleten</TableHead>
                <TableHead className="text-right">Foglalt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {levels.map((l) => {
                const p = productMap.get(String(l.productId));
                return (
                  <TableRow key={String(l._id)}>
                    <TableCell>
                      {p ? <ProductSkuLabel sku={p.sku} name={p.name} layout="stack" /> : '—'}
                    </TableCell>
                    <TableCell className="text-right">{l.onHand}</TableCell>
                    <TableCell className="text-right">{l.reserved}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Container>
  );
}
