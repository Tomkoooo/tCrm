import { NextResponse } from 'next/server';
import { requirePermission } from '@crm/auth';
import { connectDB, Product } from '@crm/db';
import { exportInventoryXlsx } from '@crm/core';

export async function GET() {
  await requirePermission('inventory:read');
  await connectDB();

  const products = await Product.find().lean().exec();
  const buf = exportInventoryXlsx(products as any);

  return new NextResponse(Buffer.from(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="inventory.xlsx"',
    },
  });
}
