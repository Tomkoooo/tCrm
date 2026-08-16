import type { Types } from 'mongoose';

/** Same global scope as logistics (managers / admins). */
export { hasGlobalLogisticsScope as hasGlobalProductWarehouseScope } from '../logistics/warehouse-access';
export { getWarehouseIdsForUser } from '../logistics/warehouse-access';

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
