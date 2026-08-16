import mongoose, { type ClientSession, type Types } from 'mongoose';
import { connectDB, Product, StockLevel } from '@crm/db-core';

/** Sets Product.warehouseIds to distinct warehouses with a StockLevel row for this product. */
export async function syncProductWarehouseIds(
  productId: Types.ObjectId,
  session?: ClientSession
): Promise<void> {
  await connectDB();

  const levels = await StockLevel.find({ productId })
    .select({ warehouseId: 1 })
    .session(session ?? null)
    .lean()
    .exec();

  const warehouseIds = [...new Set(levels.map((l) => String(l.warehouseId)))].map(
    (id) => new mongoose.Types.ObjectId(id)
  );

  await Product.updateOne({ _id: productId }, { $set: { warehouseIds } })
    .session(session ?? null)
    .exec();
}

/** Batch repair: sync warehouseIds from StockLevel for all products (dev / migration). */
export async function reconcileAllProductWarehouseIds(): Promise<{ updated: number }> {
  await connectDB();

  const productIds = await StockLevel.distinct('productId').exec();
  let updated = 0;

  for (const productId of productIds) {
    await syncProductWarehouseIds(productId as Types.ObjectId);
    updated++;
  }

  const emptyCatalog = await Product.updateMany(
    { _id: { $nin: productIds }, warehouseIds: { $ne: [] } },
    { $set: { warehouseIds: [] } }
  ).exec();

  return { updated: updated + emptyCatalog.modifiedCount };
}
