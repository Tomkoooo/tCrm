import Link from 'next/link';
import { hasPermission, requirePermission } from '@crm/auth';
import { connectDB, Product, Reservation, Warehouse } from '@crm/db';
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
import { ReservationForm } from '../_components/reservation-form';
import { ReservationStatusBadge } from '../_components/reservation-status-badge';
import { ReservationActions } from '../_components/reservation-actions';

export default async function ReservationsPage() {
  await requirePermission('logistics:read');
  await connectDB();

  const [reservations, warehouses, products] = await Promise.all([
    Reservation.find({ status: 'active' }).sort({ createdAt: -1 }).limit(100).lean().exec(),
    Warehouse.find({ isActive: true }).sort({ name: 1 }).lean().exec(),
    Product.find({ isActive: true }).sort({ sku: 1 }).limit(200).lean().exec(),
  ]);

  const productIds = reservations.map((r) => r.productId);
  const productDocs = await Product.find({ _id: { $in: productIds } })
    .select('sku names')
    .lean()
    .exec();
  const productMap = new Map(
    productDocs.map((p) => [String(p._id), { sku: p.sku, name: p.names.en ?? p.sku }])
  );
  const warehouseMap = new Map(warehouses.map((w) => [String(w._id), w.name]));

  const canWrite = await hasPermission('logistics:write');

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reservations</h1>
          <p className="text-muted-foreground text-sm">Active stock holds by warehouse.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/logistics">Dashboard</Link>
        </Button>
      </div>

      {canWrite && (
        <Card>
          <CardHeader>
            <CardTitle>Create reservation</CardTitle>
          </CardHeader>
          <CardContent>
            <ReservationForm
              warehouses={warehouses.map((w) => ({
                _id: String(w._id),
                key: w.key,
                name: w.name,
              }))}
              products={products.map((p) => ({
                _id: String(p._id),
                sku: p.sku,
                name: p.names.en ?? p.names.de ?? p.sku,
              }))}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Active reservations</CardTitle>
        </CardHeader>
        <CardContent>
          {reservations.length === 0 ? (
            <p className="text-muted-foreground text-sm">No active reservations.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((r) => {
                  const product = productMap.get(String(r.productId));
                  return (
                    <TableRow key={String(r._id)}>
                      <TableCell>{product?.sku ?? String(r.productId)}</TableCell>
                      <TableCell>
                        {warehouseMap.get(String(r.warehouseId)) ?? String(r.warehouseId)}
                      </TableCell>
                      <TableCell>{r.quantity}</TableCell>
                      <TableCell>{r.sourceRef ?? r.sourceType}</TableCell>
                      <TableCell>
                        <ReservationStatusBadge status={r.status} />
                      </TableCell>
                      <TableCell>{canWrite && <ReservationActions id={String(r._id)} />}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
