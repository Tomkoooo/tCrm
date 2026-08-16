'use server';

import mongoose from 'mongoose';
import { getCurrentUser, hasPermission } from '@crm/auth';
import {
  getWarehouseIdsForUser,
  hasGlobalProductWarehouseScope,
  mergeProductListFilter,
} from '@crm/inventory';
import { connectDB, Warehouse } from '@crm/db-core';

export type InventoryWarehouseScope = {
  isGlobal: boolean;
  warehouseIds: string[];
  warehouses: Array<{ id: string; name: string; key: string }>;
};

export async function getInventoryWarehouseScope(): Promise<InventoryWarehouseScope> {
  await connectDB();
  const user = await getCurrentUser();
  if (!user) {
    return { isGlobal: false, warehouseIds: [], warehouses: [] };
  }

  const isGlobal = hasGlobalProductWarehouseScope(user.permissions);
  if (isGlobal) {
    const warehouses = await Warehouse.find({ isActive: true }).sort({ name: 1 }).lean().exec();
    return {
      isGlobal: true,
      warehouseIds: warehouses.map((w) => String(w._id)),
      warehouses: warehouses.map((w) => ({
        id: String(w._id),
        name: w.name,
        key: w.key,
      })),
    };
  }

  const ids = await getWarehouseIdsForUser(new mongoose.Types.ObjectId(user.id));
  const warehouses = await Warehouse.find({ _id: { $in: ids }, isActive: true })
    .sort({ name: 1 })
    .lean()
    .exec();

  return {
    isGlobal: false,
    warehouseIds: ids.map(String),
    warehouses: warehouses.map((w) => ({
      id: String(w._id),
      name: w.name,
      key: w.key,
    })),
  };
}

export async function buildScopedProductFilter(
  baseFilter: Record<string, unknown>,
  selectedWarehouseId?: string
): Promise<Record<string, unknown>> {
  const scope = await getInventoryWarehouseScope();
  const allowedWarehouseIds = scope.warehouseIds.map((id) => new mongoose.Types.ObjectId(id));
  const selected = selectedWarehouseId?.trim()
    ? new mongoose.Types.ObjectId(selectedWarehouseId)
    : null;

  return mergeProductListFilter(baseFilter, {
    isGlobal: scope.isGlobal,
    allowedWarehouseIds,
    selectedWarehouseId: selected,
  });
}

export async function canAccessProductWarehouses(
  productWarehouseIds: string[] | undefined
): Promise<boolean> {
  const scope = await getInventoryWarehouseScope();
  if (scope.isGlobal) return true;
  if (!productWarehouseIds?.length) {
    return hasPermission('inventory:write');
  }
  return productWarehouseIds.some((id) => scope.warehouseIds.includes(id));
}

export async function getEditableWarehousesForInventory(): Promise<
  Array<{ id: string; name: string; key: string }>
> {
  await connectDB();
  const scope = await getInventoryWarehouseScope();
  if (scope.isGlobal) {
    const warehouses = await Warehouse.find({ isActive: true }).sort({ name: 1 }).lean().exec();
    return warehouses.map((w) => ({
      id: String(w._id),
      name: w.name,
      key: w.key,
    }));
  }
  return scope.warehouses;
}
