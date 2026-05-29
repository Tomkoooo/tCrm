import { NextResponse } from 'next/server';
import { requirePermission } from '@crm/auth';
import { exportInventoryXlsx } from '@crm/core';
import { connectDB, Product, Warehouse } from '@crm/db';
import { buildScopedProductFilter } from '@/lib/inventory/warehouse-scope';

export async function GET() {
  await requirePermission('inventory:read');
  await connectDB();

  const listFilter = await buildScopedProductFilter({});
  const [products, warehouses] = await Promise.all([
    Product.find(listFilter).lean().exec(),
    Warehouse.find().select({ key: 1 }).lean().exec(),
  ]);

  const keyById = new Map(warehouses.map((w) => [String(w._id), w.key]));
  const warehouseSlugByProductId = new Map(
    products.map((p) => {
      const keys = (p.warehouseIds ?? [])
        .map((id) => keyById.get(String(id)))
        .filter((k): k is string => Boolean(k));
      return [String(p._id), keys.join(',')];
    })
  );

  const buf = exportInventoryXlsx(products, { warehouseSlugByProductId });

  return new NextResponse(Buffer.from(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats.officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="inventory.xlsx"',
    },
  });
}
