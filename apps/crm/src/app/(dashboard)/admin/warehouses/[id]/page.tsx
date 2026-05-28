import { notFound } from 'next/navigation';
import { requirePermission } from '@crm/auth';
import { connectDB, StockLevel, Warehouse } from '@crm/db';
import { Container } from '@crm/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold">{warehouse.name}</h1>
        <p className="text-muted-foreground text-sm">Key: {warehouse.key}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock levels (top 50)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">On hand</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(levels as any[]).map((l) => (
                <TableRow key={String(l._id)}>
                  <TableCell>{String(l.productId)}</TableCell>
                  <TableCell className="text-right">{l.onHand}</TableCell>
                  <TableCell className="text-right">{l.reserved}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-muted-foreground mt-4 text-sm">
            Phase 2 will join product name/SKU and add low-stock filtering.
          </p>
        </CardContent>
      </Card>
    </Container>
  );
}
