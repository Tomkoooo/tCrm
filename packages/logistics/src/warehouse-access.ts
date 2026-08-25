import { connectDB, Warehouse } from '@crm/db-core';
import type { Types } from 'mongoose';

/** Managers / logistics leads see every site. */
export function hasGlobalLogisticsScope(permissions: string[]): boolean {
  return (
    permissions.includes('logistics:scope_all') ||
    permissions.includes('admin:access') ||
    permissions.includes('roles:manage')
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

/** Mongo filter: jobs with at least one line sourced from user's warehouses. */
export function buildLogisticsJobWarehouseFilter(
  warehouseIds: Types.ObjectId[]
): Record<string, unknown> {
  if (!warehouseIds.length) {
    return { _id: { $exists: false } };
  }
  return { 'lines.warehouseId': { $in: warehouseIds } };
}

export function buildLogisticsJobAccessFilter(
  warehouseIds: Types.ObjectId[],
  employeeId?: Types.ObjectId
): Record<string, unknown> {
  const warehouseFilter = buildLogisticsJobWarehouseFilter(warehouseIds);
  if (!employeeId) return warehouseFilter;
  return {
    $or: [
      warehouseFilter,
      { pickupEmployeeId: employeeId },
      { dropoffEmployeeId: employeeId },
      { crewEmployeeIds: employeeId },
    ],
  };
}

export async function canAccessJobWarehouse(
  userId: Types.ObjectId,
  permissions: string[],
  warehouseId: Types.ObjectId
): Promise<boolean> {
  if (hasGlobalLogisticsScope(permissions)) return true;
  const ids = await getWarehouseIdsForUser(userId);
  return ids.some((id) => id.equals(warehouseId));
}
