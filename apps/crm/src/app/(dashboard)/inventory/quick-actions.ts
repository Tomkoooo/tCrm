'use server';

import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import {
  connectDB,
  Category,
  Product,
  StockAdjustment,
  StockLevel,
  User,
  Warehouse,
} from '@crm/db-core';
import { requireAuth, requirePermission } from '@crm/auth';
import { allocateNextProductSku, setProductStockLevel } from '@crm/inventory';
import { productDisplayName } from '@crm/lib';
import {
  quickProductSchema,
  warehouseStockBatchSchema,
  warehouseStockSetSchema,
} from '@crm/lib/validation';
import type { SearchItem } from '@crm/ui';

import {
  buildScopedProductFilter,
  getEditableWarehousesForInventory,
  getInventoryWarehouseScope,
} from '@/lib/inventory/warehouse-scope';

export type QuickProductFormState =
  | { success: false; fieldErrors?: Record<string, string[]>; message?: string }
  | { success: true; sku: string; nameHu: string; addAnother: boolean };

function zodToFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || 'form';
    fieldErrors[key] = fieldErrors[key] ?? [];
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}

function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code: number }).code === 11000
  );
}

function revalidateInventory() {
  revalidatePath('/inventory');
  revalidatePath('/inventory/count');
  revalidatePath('/inventory/builds');
}

export async function quickCreateProductAction(
  _prev: QuickProductFormState,
  formData: FormData
): Promise<QuickProductFormState> {
  await requirePermission('inventory:write');
  const user = await requireAuth();
  if (!user?.id) return { success: false, message: 'Nincs bejelentkezve.' };
  await connectDB();

  const parsed = quickProductSchema.safeParse({
    nameHu: formData.get('name_hu'),
    categorySlug: formData.get('crm_category_slug'),
    warehouseId: formData.get('warehouseId'),
    quantity: formData.get('quantity'),
  });
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: zodToFieldErrors(parsed.error.issues),
      message: 'Ellenőrizd a mezőket.',
    };
  }

  const category = await Category.findOne({ slug: parsed.data.categorySlug }).lean().exec();
  if (!category) {
    return { success: false, message: `Ismeretlen kategória: ${parsed.data.categorySlug}` };
  }

  const scope = await getInventoryWarehouseScope();
  const warehouseId = parsed.data.warehouseId?.trim() || undefined;
  if (warehouseId) {
    if (!scope.isGlobal && !scope.warehouseIds.includes(warehouseId)) {
      return { success: false, message: 'Nincs jogosultság a kiválasztott raktárhoz.' };
    }
    if (!scope.warehouses.some((w) => w.id === warehouseId)) {
      return { success: false, message: 'Ismeretlen raktár.' };
    }
  }

  const addAnother = String(formData.get('intent') ?? '') === 'saveAnother';
  const nameHu = parsed.data.nameHu;
  const bulkScope = {
    isGlobal: scope.isGlobal,
    allowedWarehouseIds: scope.warehouseIds.map((id) => new mongoose.Types.ObjectId(id)),
  };

  let createdSku = '';
  let createdId: mongoose.Types.ObjectId | null = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const sku = await allocateNextProductSku(category);
    try {
      const created = await Product.create({
        sku,
        names: { hu: nameHu },
        categoryIds: [category._id],
        warehouseIds: [],
        components: [],
        imageIds: [],
        assemblyGuideMediaIds: [],
        isActive: true,
        isDiscontinued: false,
        isConsumable: false,
      });
      createdSku = sku;
      createdId = created._id as mongoose.Types.ObjectId;
      break;
    } catch (error) {
      if (isDuplicateKeyError(error) && attempt < 7) continue;
      return {
        success: false,
        message: error instanceof Error ? error.message : 'A termék létrehozása sikertelen.',
      };
    }
  }

  if (!createdSku || !createdId) {
    return { success: false, message: 'Nem sikerült egyedi SKU-t kiosztani.' };
  }

  if (warehouseId) {
    try {
      await setProductStockLevel(
        createdId,
        new mongoose.Types.ObjectId(warehouseId),
        parsed.data.quantity ?? 0,
        user.id,
        bulkScope,
        { reason: 'initial_load', note: 'Gyors felvétel' }
      );
    } catch {
      // Product exists; quantity can be set from the product list stock cell.
    }
  }

  revalidateInventory();
  return { success: true, sku: createdSku, nameHu, addAnother };
}

export async function setWarehouseStockAction(
  productId: string,
  warehouseId: string,
  quantity: number
): Promise<{ success: true; onHand: number } | { success: false; message: string }> {
  await requirePermission('inventory:write');
  const user = await requireAuth();
  if (!user?.id) return { success: false, message: 'Nincs bejelentkezve.' };
  await connectDB();

  const parsed = warehouseStockSetSchema.safeParse({ productId, warehouseId, quantity });
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Érvénytelen adat.' };
  }

  if (
    !mongoose.Types.ObjectId.isValid(parsed.data.productId) ||
    !mongoose.Types.ObjectId.isValid(parsed.data.warehouseId)
  ) {
    return { success: false, message: 'Érvénytelen azonosító.' };
  }

  const productOid = new mongoose.Types.ObjectId(parsed.data.productId);
  const warehouseOid = new mongoose.Types.ObjectId(parsed.data.warehouseId);

  const product = await Product.findById(productOid).select({ _id: 1, sku: 1 }).lean().exec();
  if (!product) return { success: false, message: 'A termék nem található.' };

  const scope = await getInventoryWarehouseScope();
  if (!scope.isGlobal && !scope.warehouseIds.includes(parsed.data.warehouseId)) {
    return { success: false, message: 'Nincs jogosultság ehhez a raktárhoz.' };
  }

  try {
    await setProductStockLevel(
      productOid,
      warehouseOid,
      parsed.data.quantity,
      user.id,
      {
        isGlobal: scope.isGlobal,
        allowedWarehouseIds: scope.warehouseIds.map((id) => new mongoose.Types.ObjectId(id)),
      },
      {
        reason: 'physical_count',
        note: 'Leltár',
      }
    );
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'A készlet mentése sikertelen.',
    };
  }

  revalidateInventory();
  revalidatePath(`/inventory/${product.sku}`);
  return { success: true, onHand: parsed.data.quantity };
}

export async function searchCountProductsAction(
  query: string,
  warehouseId: string
): Promise<SearchItem[]> {
  await requirePermission('inventory:read');
  await connectDB();

  const q = query.trim();
  if (!q || !warehouseId) return [];

  const scope = await getInventoryWarehouseScope();
  if (!scope.isGlobal && !scope.warehouseIds.includes(warehouseId)) return [];

  const textFilter = {
    $or: [
      { sku: { $regex: q, $options: 'i' } },
      { internalSku: { $regex: q, $options: 'i' } },
      { 'names.hu': { $regex: q, $options: 'i' } },
      { 'names.en': { $regex: q, $options: 'i' } },
      { brand: { $regex: q, $options: 'i' } },
    ],
    isActive: true,
  };
  const filter = await buildScopedProductFilter(textFilter);

  const products = await Product.find(filter)
    .select({ sku: 1, names: 1, brand: 1 })
    .limit(20)
    .lean()
    .exec();

  const ids = products.map((p) => p._id);
  const levels =
    ids.length > 0
      ? await StockLevel.find({
          productId: { $in: ids },
          warehouseId: new mongoose.Types.ObjectId(warehouseId),
        })
          .select({ productId: 1, onHand: 1 })
          .lean()
          .exec()
      : [];
  const onHandByProduct = new Map(levels.map((l) => [String(l.productId), l.onHand ?? 0]));

  return products.map((p) => {
    const name = productDisplayName(p.names, p.sku);
    const onHand = onHandByProduct.get(String(p._id)) ?? 0;
    return {
      value: String(p._id),
      label: name,
      sublabel: `${p.sku} · jelenlegi: ${onHand}`,
      raw: { sku: p.sku, onHand },
    };
  });
}

export type ProductStockEditorLevel = {
  warehouseId: string;
  warehouseName: string;
  warehouseKey: string;
  onHand: number;
};

export type ProductStockEditorAdjustment = {
  id: string;
  at: string;
  warehouseId: string;
  warehouseName: string;
  delta: number;
  reason: string;
  note?: string;
  byUserName?: string;
};

export type ProductStockEditorData = {
  productId: string;
  sku: string;
  name: string;
  levels: ProductStockEditorLevel[];
  adjustments: ProductStockEditorAdjustment[];
};

export async function getProductStockEditorAction(
  sku: string
): Promise<ProductStockEditorData | null> {
  await requirePermission('inventory:read');
  await connectDB();

  const product = await Product.findOne({ sku: sku.trim() })
    .select({ sku: 1, names: 1 })
    .lean()
    .exec();
  if (!product) return null;

  const warehouses = await getEditableWarehousesForInventory();
  const stockDocs = await StockLevel.find({ productId: product._id }).lean().exec();
  const onHandByWarehouse = new Map(stockDocs.map((s) => [String(s.warehouseId), s.onHand ?? 0]));

  const adjustments = await StockAdjustment.find({ productId: product._id })
    .sort({ at: -1 })
    .limit(20)
    .lean()
    .exec();

  const warehouseNameById = new Map(warehouses.map((w) => [w.id, w.name]));
  const extraWarehouseIds = [
    ...new Set(
      adjustments.map((a) => String(a.warehouseId)).filter((id) => !warehouseNameById.has(id))
    ),
  ];
  if (extraWarehouseIds.length > 0) {
    const extra = await Warehouse.find({ _id: { $in: extraWarehouseIds } })
      .select({ name: 1 })
      .lean()
      .exec();
    for (const w of extra) warehouseNameById.set(String(w._id), w.name);
  }

  const userIds = [...new Set(adjustments.map((a) => String(a.byUserId)))];
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } })
        .select({ name: 1 })
        .lean()
        .exec()
    : [];
  const userNameById = new Map(users.map((u) => [String(u._id), u.name]));

  return {
    productId: String(product._id),
    sku: product.sku,
    name: productDisplayName(product.names, product.sku),
    levels: warehouses.map((w) => ({
      warehouseId: w.id,
      warehouseName: w.name,
      warehouseKey: w.key,
      onHand: onHandByWarehouse.get(w.id) ?? 0,
    })),
    adjustments: adjustments.map((a) => ({
      id: String(a._id),
      at: a.at.toISOString(),
      warehouseId: String(a.warehouseId),
      warehouseName: warehouseNameById.get(String(a.warehouseId)) ?? 'Raktár',
      delta: a.delta,
      reason: a.reason,
      note: a.note,
      byUserName: userNameById.get(String(a.byUserId)),
    })),
  };
}

export async function saveProductStockLevelsAction(
  sku: string,
  levels: Array<{ warehouseId: string; quantity: number }>
): Promise<{ success: true; message: string } | { success: false; message: string }> {
  await requirePermission('inventory:write');
  const user = await requireAuth();
  if (!user?.id) return { success: false, message: 'Nincs bejelentkezve.' };
  await connectDB();

  const parsed = warehouseStockBatchSchema.safeParse({ sku, levels });
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Érvénytelen adat.' };
  }

  const product = await Product.findOne({ sku: parsed.data.sku.trim() })
    .select({ _id: 1, sku: 1 })
    .lean()
    .exec();
  if (!product) return { success: false, message: 'A termék nem található.' };

  const scope = await getInventoryWarehouseScope();
  const bulkScope = {
    isGlobal: scope.isGlobal,
    allowedWarehouseIds: scope.warehouseIds.map((id) => new mongoose.Types.ObjectId(id)),
  };

  try {
    for (const level of parsed.data.levels) {
      if (!scope.isGlobal && !scope.warehouseIds.includes(level.warehouseId)) {
        return { success: false, message: 'Nincs jogosultság egy kiválasztott raktárhoz.' };
      }
      await setProductStockLevel(
        product._id,
        new mongoose.Types.ObjectId(level.warehouseId),
        level.quantity,
        user.id,
        bulkScope,
        { reason: 'physical_count', note: 'Leltár' }
      );
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'A készlet mentése sikertelen.',
    };
  }

  revalidateInventory();
  revalidatePath(`/inventory/${product.sku}`);
  return { success: true, message: 'Készlet mentve.' };
}

export async function revertStockAdjustmentAction(
  adjustmentId: string
): Promise<{ success: true; message: string } | { success: false; message: string }> {
  await requirePermission('inventory:write');
  const user = await requireAuth();
  if (!user?.id) return { success: false, message: 'Nincs bejelentkezve.' };
  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(adjustmentId)) {
    return { success: false, message: 'Érvénytelen azonosító.' };
  }

  const adjustment = await StockAdjustment.findById(adjustmentId).lean().exec();
  if (!adjustment) return { success: false, message: 'A naplóbejegyzés nem található.' };
  if (adjustment.delta === 0)
    return { success: false, message: 'Ezt a sort nem kell visszavonni.' };

  const product = await Product.findById(adjustment.productId).select({ sku: 1 }).lean().exec();
  if (!product) return { success: false, message: 'A termék nem található.' };

  const scope = await getInventoryWarehouseScope();
  const warehouseId = String(adjustment.warehouseId);
  if (!scope.isGlobal && !scope.warehouseIds.includes(warehouseId)) {
    return { success: false, message: 'Nincs jogosultság ehhez a raktárhoz.' };
  }

  const current = await StockLevel.findOne({
    productId: adjustment.productId,
    warehouseId: adjustment.warehouseId,
  })
    .lean()
    .exec();
  const target = Math.max(0, (current?.onHand ?? 0) - adjustment.delta);

  try {
    await setProductStockLevel(
      adjustment.productId,
      adjustment.warehouseId,
      target,
      user.id,
      {
        isGlobal: scope.isGlobal,
        allowedWarehouseIds: scope.warehouseIds.map((id) => new mongoose.Types.ObjectId(id)),
      },
      { reason: 'correction', note: 'Leltár visszavonása' }
    );
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'A visszavonás sikertelen.',
    };
  }

  revalidateInventory();
  revalidatePath(`/inventory/${product.sku}`);
  return { success: true, message: 'Készlet-módosítás visszavonva.' };
}
