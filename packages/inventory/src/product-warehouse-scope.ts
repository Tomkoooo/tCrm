import { connectDB, Warehouse } from '@crm/db-core';
import type { Types } from 'mongoose';

/**
 * Catalog-wide product views. Inventory writers, warehouse managers, and admins
 * see every warehouse. Logistics `scope_all` is kept for when that module returns.
 */
export function hasGlobalProductWarehouseScope(permissions: string[]): boolean {
  return (
    permissions.includes('inventory:read') ||
    permissions.includes('inventory:write') ||
    permissions.includes('inventory:import') ||
    permissions.includes('warehouses:manage') ||
    permissions.includes('admin:access') ||
    permissions.includes('roles:manage') ||
    permissions.includes('logistics:scope_all')
  );
}

export async function getWarehouseIdsForUser(userId: Types.ObjectId): Promise<Types.ObjectId[]> {
  await connectDB();
  const warehouses = await Warehouse.find({
    isActive: true,
    assignedUserIds: userId,
  })
    .select({ _id: 1 })
    .lean()
    .exec();
  return warehouses.map((w) => w._id as Types.ObjectId);
}

/** Filter products by catalog warehouse assignment (`Product.warehouseIds`). */
export function buildProductWarehouseFilter(
  allowedWarehouseIds: Types.ObjectId[],
  selectedWarehouseId?: Types.ObjectId | null
): Record<string, unknown> {
  if (selectedWarehouseId) {
    const allowed = allowedWarehouseIds.some((id) => id.equals(selectedWarehouseId));
    if (!allowed) return { _id: { $exists: false } };
    return { warehouseIds: selectedWarehouseId };
  }
  if (!allowedWarehouseIds.length) {
    return { _id: { $exists: false } };
  }
  return { warehouseIds: { $in: allowedWarehouseIds } };
}

export function mergeProductListFilter(
  baseFilter: Record<string, unknown>,
  options: {
    isGlobal: boolean;
    allowedWarehouseIds: Types.ObjectId[];
    selectedWarehouseId?: Types.ObjectId | null;
  }
): Record<string, unknown> {
  const scopeFilter = options.isGlobal
    ? options.selectedWarehouseId
      ? { warehouseIds: options.selectedWarehouseId }
      : {}
    : buildProductWarehouseFilter(options.allowedWarehouseIds, options.selectedWarehouseId);

  if (!Object.keys(scopeFilter).length) return baseFilter;
  return { $and: [baseFilter, scopeFilter] };
}
