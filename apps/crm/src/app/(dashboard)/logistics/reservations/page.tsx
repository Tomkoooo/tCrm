import Link from 'next/link';
import { hasPermission, requireAnyPermission } from '@crm/auth';
import { LOGISTICS_READ_PERMISSION_KEYS } from '@crm/logistics/permissions';
import { connectDB, Product, Reservation, Warehouse } from '@crm/db-core';
import { Container } from '@crm/ui';
import { Button } from '@crm/ui';
import { ReservationsPageClient } from './_components/reservations-page-client';
import type { ReservationLineRow } from './_components/reservations-lines-table';

export default async function ReservationsPage() {
  await requireAnyPermission([...LOGISTICS_READ_PERMISSION_KEYS]);
  await connectDB();

  const [reservations, warehouses] = await Promise.all([
    Reservation.find({ status: 'active' }).sort({ createdAt: -1 }).limit(500).lean().exec(),
    Warehouse.find({ isActive: true }).sort({ name: 1 }).lean().exec(),
  ]);

  const productIds = [...new Set(reservations.map((r) => String(r.productId)))];
  const products = await Product.find({ _id: { $in: productIds } })
    .select('sku names')
    .lean()
    .exec();

  const productMap = new Map(
    products.map((p) => [
      String(p._id),
      {
        sku: p.sku,
        name: p.names?.hu ?? p.names?.en ?? p.sku,
      },
    ])
  );
  const warehouseMap = new Map(warehouses.map((w) => [String(w._id), w.name]));

  const lines: ReservationLineRow[] = reservations.map((r) => {
    const product = productMap.get(String(r.productId));
    return {
      id: String(r._id),
      sourceRef: r.sourceRef ?? `egyedi-${String(r._id)}`,
      warehouseName: warehouseMap.get(String(r.warehouseId)) ?? '—',
      sku: product?.sku ?? '—',
      name: product?.name ?? '—',
      quantity: r.quantity,
      status: r.status,
    };
  });

  const canWrite = await hasPermission('logistics:write');

  return (
    <Container className="flex max-w-6xl flex-col gap-3 md:gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Foglalások</h1>
          <p className="text-muted-foreground text-sm">Aktív foglalások soronként.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/logistics">Logisztika</Link>
        </Button>
      </div>

      <ReservationsPageClient
        lines={lines}
        canWrite={canWrite}
        warehouses={warehouses.map((w) => ({
          _id: String(w._id),
          key: w.key,
          name: w.name,
        }))}
      />
    </Container>
  );
}
