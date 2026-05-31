'use server';

import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import {
  connectDB,
  Category,
  Product,
  StockAdjustment,
  StockLevel,
  Supplier,
  Warehouse,
} from '@crm/db';
import { requirePermission, requireAuth } from '@crm/auth';
import {
  applyBulkProductOperation,
  setProductStockLevel,
  syncProductWarehouseIds,
  type BulkProductOperation,
  syncMediaUsage,
  linkUrlsFromMediaIds,
} from '@crm/core';
import {
  parseWarehouseIdsJson,
  productComponentsSchema,
  productSchema,
  productStockLevelsSchema,
  stockAdjustmentSchema,
} from '@crm/lib/validation';
import { buildDataTableMongoQuery, parseDataTableQuery } from '@crm/ui';
import { INVENTORY_PRODUCT_COLUMNS } from '@/lib/inventory/product-table-columns';
import {
  canAccessProductWarehouses,
  buildScopedProductFilter,
  getEditableWarehousesForInventory,
  getInventoryWarehouseScope,
} from '@/lib/inventory/warehouse-scope';

export type ProductEditContext = {
  productId: string;
  imageIds: string[];
  assemblyGuide?: string;
  assemblyGuideMediaIds: string[];
  components: Array<{
    productId: string;
    productSku: string;
    label: string;
    quantity: number;
  }>;
  stockLevels: Array<{
    warehouseId: string;
    warehouseName: string;
    warehouseKey: string;
    onHand: number;
  }>;
  warehouses: Array<{ id: string; name: string; key: string }>;
  isGlobalScope: boolean;
  systemWarehouseCount: number;
};

export async function getProductEditContext(sku: string): Promise<ProductEditContext | null> {
  await requirePermission('inventory:read');
  await connectDB();

  const normalizedSku = sku.trim();
  if (!normalizedSku) return null;

  const product = await Product.findOne({ sku: normalizedSku })
    .select({
      _id: 1,
      imageIds: 1,
      assemblyGuide: 1,
      assemblyGuideMediaIds: 1,
      components: 1,
      warehouseIds: 1,
    })
    .lean()
    .exec();

  if (!product) return null;

  const allowed = await canAccessProductWarehouses(
    (product.warehouseIds ?? []).map((id) => String(id))
  );
  if (!allowed) return null;

  const scope = await getInventoryWarehouseScope();
  const editableWarehouses = await getEditableWarehousesForInventory();
  const systemWarehouseCount = await Warehouse.countDocuments({ isActive: true }).exec();
  const stockDocs = await StockLevel.find({ productId: product._id }).lean().exec();
  const stockByWarehouse = new Map(stockDocs.map((s) => [String(s.warehouseId), s.onHand ?? 0]));

  const componentIds = (product.components ?? []).map((c) => c.productId);
  const componentProducts = componentIds.length
    ? await Product.find({ _id: { $in: componentIds } })
        .select({ sku: 1, names: 1 })
        .lean()
        .exec()
    : [];

  const componentById = new Map(
    componentProducts.map((p) => [
      String(p._id),
      {
        sku: p.sku,
        name: p.names?.hu ?? p.names?.en ?? p.names?.de ?? p.sku,
      },
    ])
  );

  return {
    productId: String(product._id),
    imageIds: (product.imageIds ?? []).map((id) => String(id)),
    assemblyGuide: product.assemblyGuide ?? undefined,
    assemblyGuideMediaIds: (product.assemblyGuideMediaIds ?? []).map((id) => String(id)),
    components: (product.components ?? []).map((line) => {
      const comp = componentById.get(String(line.productId));
      const productSku = comp?.sku ?? '—';
      const name = comp?.name ?? productSku;
      return {
        productId: String(line.productId),
        productSku,
        label: name === productSku ? productSku : `${productSku} · ${name}`,
        quantity: line.quantity,
      };
    }),
    stockLevels: editableWarehouses.map((w) => ({
      warehouseId: w.id,
      warehouseName: w.name,
      warehouseKey: w.key,
      onHand: stockByWarehouse.get(w.id) ?? 0,
    })),
    warehouses: editableWarehouses,
    isGlobalScope: scope.isGlobal,
    systemWarehouseCount,
  };
}

function parseComponentsJson(formData: FormData) {
  try {
    return JSON.parse(String(formData.get('componentsJson') ?? '[]')) as Array<{
      productId: string;
      quantity: number;
    }>;
  } catch {
    return null;
  }
}

function parseStockLevelsJson(formData: FormData) {
  try {
    return JSON.parse(String(formData.get('stockLevelsJson') ?? '[]')) as Array<{
      warehouseId: string;
      quantity: number;
    }>;
  } catch {
    return null;
  }
}

export type InventoryFormState =
  | { success: false; fieldErrors?: Record<string, string[]>; message?: string }
  | { success: true; message?: string; sku?: string };

function zodToFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || 'form';
    fieldErrors[key] = fieldErrors[key] ?? [];
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}

const BILD_FIELDS = ['bild1', 'bild2', 'bild3', 'bild4', 'bild5'] as const;

function parseBildHints(formData: FormData): string[] {
  return BILD_FIELDS.map((k) => String(formData.get(k) ?? '').trim()).filter(Boolean);
}

function parseProductCandidate(formData: FormData) {
  return {
    sku: formData.get('sku'),
    supplierSku: formData.get('supplierSku'),
    supplierNo: formData.get('supplierNo'),
    brand: formData.get('brand'),
    ean: formData.get('ean'),
    names: {
      de: formData.get('name_de'),
      en: formData.get('name_en'),
      hu: formData.get('name_hu'),
    },
    descriptions: {
      de: formData.get('long_description_de'),
      en: formData.get('long_description_en'),
      hu: formData.get('long_description_hu'),
    },
    colors: {
      de: formData.get('Color_de'),
      en: formData.get('Color_en'),
      hu: formData.get('Color_hu'),
    },
    dimensionsMm: {
      length: formData.get('length'),
      width: formData.get('width'),
      height: formData.get('height'),
    },
    weightKg: formData.get('weight'),
    packageWeightKg: formData.get('packageweight'),
    packageVolumeM3: formData.get('packagevolume'),
    pricing: {
      recommendedRetailPriceEur: formData.get('recommendet_retail_price_with_german_tax'),
      recommendedRetailPriceHuf: formData.get('recommendet_retail_price_with_tax_HUF'),
      streetPriceEur: formData.get('streetprice_with_german_tax'),
      streetPriceHuf: formData.get('streetprice_without_HUN_tax_HUF'),
      merchantPriceEur: formData.get('merchant_price'),
      merchantPriceHuf: formData.get('merchant_price_HUF'),
    },
    youtubeVideo: formData.get('youtubevideo'),
    youtubeId: formData.get('youtubeid'),
    freightLevel: formData.get('freightlevel'),
    stockLevelHint: formData.get('stocklevel'),
    availabilityWeeks: formData.get('availability_in_weeks'),
    inCategories: formData.get('inCategories'),
    isDiscontinued: formData.get('discontinued') === '1' || formData.get('discontinued') === 'true',
    isActive: formData.get('isActive') !== 'false',
    owner: formData.get('Owner'),
    rental: {
      rentFeeDay: formData.get('RentFeeDay'),
      rentFeeWeekend: formData.get('RentFeeWeekend'),
      rentFeeWeek: formData.get('RentFeeWeek'),
      rentFlag: formData.get('Rent'),
    },
    discounts: {
      discount1Max: formData.get('Discont 1.'),
      discount2Owner: formData.get('Discont 2.'),
    },
    externalImageHints: parseBildHints(formData),
    components: [],
    categoryPath: undefined,
  };
}

async function resolveCategoryAndSupplier(formData: FormData) {
  const categoryIds: mongoose.Types.ObjectId[] = [];
  const categorySlug = String(formData.get('crm_category_slug') ?? '').trim();
  if (categorySlug) {
    const cat = await Category.findOne({ slug: categorySlug }).select('_id').lean().exec();
    if (!cat) {
      return { error: `Ismeretlen kategória: ${categorySlug}` as const };
    }
    categoryIds.push(cat._id as mongoose.Types.ObjectId);
  }

  let supplierId: mongoose.Types.ObjectId | undefined;
  const supplierKey = String(formData.get('crm_supplier_slug') ?? '').trim();
  if (supplierKey) {
    const sup = await Supplier.findOne({ key: supplierKey }).select('_id').lean().exec();
    if (!sup) {
      return { error: `Ismeretlen beszállító: ${supplierKey}` as const };
    }
    supplierId = sup._id as mongoose.Types.ObjectId;
  }

  return { categoryIds, supplierId };
}

async function parseWarehouseIdsFromForm(
  formData: FormData
): Promise<{ warehouseIds: mongoose.Types.ObjectId[] } | { error: string }> {
  let ids: string[] = [];
  try {
    ids = parseWarehouseIdsJson(formData.get('warehouseIdsJson') as string);
  } catch {
    return { error: 'Érvénytelen raktár lista.' };
  }

  const scope = await getInventoryWarehouseScope();
  if (!scope.isGlobal) {
    const invalid = ids.find((id) => !scope.warehouseIds.includes(id));
    if (invalid) return { error: 'Nincs jogosultság a kiválasztott raktárhoz.' };
  }

  return {
    warehouseIds: ids.map((id) => new mongoose.Types.ObjectId(id)),
  };
}

export async function createProductAction(
  _prev: InventoryFormState,
  formData: FormData
): Promise<InventoryFormState> {
  await requirePermission('inventory:write');
  await connectDB();

  const parsed = productSchema.safeParse(parseProductCandidate(formData));
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: zodToFieldErrors(parsed.error.issues),
      message: 'Ellenőrizd a mezőket.',
    };
  }

  const existing = await Product.findOne({ sku: parsed.data.sku });
  if (existing) {
    return { success: false, message: 'Ez a CRM SKU már létezik.' };
  }

  const links = await resolveCategoryAndSupplier(formData);
  if ('error' in links) {
    return { success: false, message: links.error };
  }

  const warehouses = await parseWarehouseIdsFromForm(formData);
  if ('error' in warehouses) {
    return { success: false, message: warehouses.error };
  }

  const imageIds = formData
    .getAll('imageId')
    .map((v) => String(v))
    .filter(Boolean);

  const linkHints = await linkUrlsFromMediaIds(imageIds);
  const bildHints = parseBildHints(formData);
  const externalImageHints = [...new Set([...bildHints, ...linkHints])];

  const created = await Product.create({
    sku: parsed.data.sku,
    supplierSku: parsed.data.supplierSku,
    supplierNo: parsed.data.supplierNo,
    supplierId: links.supplierId,
    brand: parsed.data.brand,
    ean: parsed.data.ean,
    names: parsed.data.names,
    descriptions: parsed.data.descriptions,
    colors: parsed.data.colors,
    dimensionsMm: parsed.data.dimensionsMm,
    weightKg: parsed.data.weightKg,
    packageWeightKg: parsed.data.packageWeightKg,
    packageVolumeM3: parsed.data.packageVolumeM3,
    pricing: parsed.data.pricing,
    youtubeVideo: parsed.data.youtubeVideo,
    youtubeId: parsed.data.youtubeId,
    freightLevel: parsed.data.freightLevel,
    stockLevelHint: parsed.data.stockLevelHint,
    availabilityWeeks: parsed.data.availabilityWeeks,
    inCategories: parsed.data.inCategories,
    isDiscontinued: parsed.data.isDiscontinued ?? false,
    isActive: parsed.data.isActive ?? true,
    owner: parsed.data.owner,
    rental: parsed.data.rental,
    discounts: parsed.data.discounts,
    externalImageHints,
    imageIds: imageIds.map((id) => new mongoose.Types.ObjectId(id)),
    categoryIds: links.categoryIds,
    warehouseIds: warehouses.warehouseIds,
    components: [],
  });

  if (imageIds.length > 0) {
    await syncMediaUsage({
      entityType: 'product',
      entityId: created._id,
      previousMediaIds: [],
      nextMediaIds: imageIds,
    });
  }

  revalidatePath('/inventory');
  revalidatePath('/inventory/builds');
  return { success: true, message: 'Termék létrehozva.', sku: parsed.data.sku };
}

export async function updateProductAction(
  _prev: InventoryFormState,
  formData: FormData
): Promise<InventoryFormState> {
  await requirePermission('inventory:write');
  const user = await requireAuth();
  if (!user?.id) return { success: false, message: 'Nincs bejelentkezve.' };
  await connectDB();

  const sku = String(formData.get('sku') ?? '').trim();
  const existing = await Product.findOne({ sku });
  if (!existing) return { success: false, message: 'A termék nem található.' };

  const allowed = await canAccessProductWarehouses(
    (existing.warehouseIds ?? []).map((id) => String(id))
  );
  if (!allowed) return { success: false, message: 'Nincs jogosultság ehhez a termékhez.' };

  const candidate = {
    ...existing.toObject(),
    sku,
    supplierSku: formData.get('supplierSku'),
    supplierNo: formData.get('supplierNo'),
    brand: formData.get('brand'),
    ean: formData.get('ean'),
    names: {
      de: formData.get('name_de'),
      en: formData.get('name_en'),
      hu: formData.get('name_hu'),
    },
    descriptions: {
      de: formData.get('long_description_de'),
      en: formData.get('long_description_en'),
      hu: formData.get('long_description_hu'),
    },
    colors: {
      de: formData.get('Color_de'),
      en: formData.get('Color_en'),
      hu: formData.get('Color_hu'),
    },
    dimensionsMm: {
      length: formData.get('length'),
      width: formData.get('width'),
      height: formData.get('height'),
    },
    weightKg: formData.get('weight'),
    packageWeightKg: formData.get('packageweight'),
    packageVolumeM3: formData.get('packagevolume'),
    pricing: {
      recommendedRetailPriceEur: formData.get('recommendet_retail_price_with_german_tax'),
      recommendedRetailPriceHuf: formData.get('recommendet_retail_price_with_tax_HUF'),
      streetPriceEur: formData.get('streetprice_with_german_tax'),
      streetPriceHuf: formData.get('streetprice_without_HUN_tax_HUF'),
      merchantPriceEur: formData.get('merchant_price'),
      merchantPriceHuf: formData.get('merchant_price_HUF'),
    },
    youtubeVideo: formData.get('youtubevideo'),
    youtubeId: formData.get('youtubeid'),
    freightLevel: formData.get('freightlevel'),
    stockLevelHint: formData.get('stocklevel'),
    availabilityWeeks: formData.get('availability_in_weeks'),
    inCategories: formData.get('inCategories'),
    isDiscontinued: formData.get('discontinued') === '1' || formData.get('discontinued') === 'true',
    isActive: formData.get('isActive') !== 'false',
    owner: formData.get('Owner'),
    rental: {
      rentFeeDay: formData.get('RentFeeDay'),
      rentFeeWeekend: formData.get('RentFeeWeekend'),
      rentFeeWeek: formData.get('RentFeeWeek'),
      rentFlag: formData.get('Rent'),
    },
    discounts: {
      discount1Max: formData.get('Discont 1.'),
      discount2Owner: formData.get('Discont 2.'),
    },
  };

  const parsed = productSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: zodToFieldErrors(parsed.error.issues),
      message: 'Ellenőrizd a mezőket.',
    };
  }

  const rawComponents = parseComponentsJson(formData);
  if (rawComponents === null) {
    return { success: false, message: 'Érvénytelen alkatrész lista.' };
  }

  const componentsParsed = productComponentsSchema.safeParse(rawComponents);
  if (!componentsParsed.success) {
    return {
      success: false,
      fieldErrors: zodToFieldErrors(componentsParsed.error.issues),
      message: 'Ellenőrizd az alkatrészlistát.',
    };
  }

  const productIdStr = existing._id.toString();
  if (componentsParsed.data.some((c) => c.productId === productIdStr)) {
    return { success: false, message: 'A termék nem lehet saját alkatrésze.' };
  }

  if (componentsParsed.data.length > 0) {
    const componentDocs = await Product.find({
      _id: { $in: componentsParsed.data.map((c) => c.productId) },
      isActive: true,
    })
      .select('_id')
      .lean()
      .exec();

    if (componentDocs.length !== componentsParsed.data.length) {
      return { success: false, message: 'Egy vagy több alkatrész nem található vagy inaktív.' };
    }
  }

  const rawStockLevels = parseStockLevelsJson(formData);
  if (rawStockLevels === null) {
    return { success: false, message: 'Érvénytelen készlet adat.' };
  }

  const stockParsed = productStockLevelsSchema.safeParse(rawStockLevels);
  if (!stockParsed.success) {
    return {
      success: false,
      fieldErrors: zodToFieldErrors(stockParsed.error.issues),
      message: 'Ellenőrizd a készlet mezőket.',
    };
  }

  const imageIds = formData
    .getAll('imageId')
    .map((v) => String(v))
    .filter(Boolean);
  const guideMediaIds = formData
    .getAll('guideMediaId')
    .map((v) => String(v))
    .filter(Boolean);
  const previousMediaIds = (existing.imageIds ?? []).map((id) => id.toString());
  const previousGuideMediaIds = (existing.assemblyGuideMediaIds ?? []).map((id) => id.toString());
  const linkHints = await linkUrlsFromMediaIds(imageIds);
  const bildHints = parseBildHints(formData);
  const externalImageHints = [...new Set([...bildHints, ...linkHints])];

  const assemblyGuideRaw = String(formData.get('assemblyGuide') ?? '').trim();
  const assemblyGuide = assemblyGuideRaw || undefined;

  const scope = await getInventoryWarehouseScope();
  const bulkScope = {
    isGlobal: scope.isGlobal,
    allowedWarehouseIds: scope.warehouseIds.map((id) => new mongoose.Types.ObjectId(id)),
  };

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      existing.set({
        supplierSku: parsed.data.supplierSku,
        supplierNo: parsed.data.supplierNo,
        brand: parsed.data.brand,
        ean: parsed.data.ean,
        names: parsed.data.names,
        descriptions: parsed.data.descriptions,
        colors: parsed.data.colors,
        dimensionsMm: parsed.data.dimensionsMm,
        weightKg: parsed.data.weightKg,
        packageWeightKg: parsed.data.packageWeightKg,
        packageVolumeM3: parsed.data.packageVolumeM3,
        pricing: parsed.data.pricing,
        youtubeVideo: parsed.data.youtubeVideo,
        youtubeId: parsed.data.youtubeId,
        freightLevel: parsed.data.freightLevel,
        stockLevelHint: parsed.data.stockLevelHint,
        availabilityWeeks: parsed.data.availabilityWeeks,
        inCategories: parsed.data.inCategories,
        isDiscontinued: parsed.data.isDiscontinued ?? false,
        isActive: parsed.data.isActive ?? true,
        owner: parsed.data.owner,
        rental: parsed.data.rental,
        discounts: parsed.data.discounts,
        externalImageHints,
        imageIds: imageIds.map((id) => new mongoose.Types.ObjectId(id)),
        assemblyGuideMediaIds: guideMediaIds.map((id) => new mongoose.Types.ObjectId(id)),
        assemblyGuide,
        components: componentsParsed.data.map((c) => ({
          productId: new mongoose.Types.ObjectId(c.productId),
          quantity: c.quantity,
        })),
      });

      await existing.save({ session });

      for (const level of stockParsed.data) {
        await setProductStockLevel(
          existing._id,
          new mongoose.Types.ObjectId(level.warehouseId),
          level.quantity,
          user.id,
          bulkScope,
          { session }
        );
      }
    });
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : 'A mentés sikertelen.',
    };
  } finally {
    session.endSession();
  }

  await syncMediaUsage({
    entityType: 'product',
    entityId: existing._id,
    fieldName: 'imageIds',
    previousMediaIds,
    nextMediaIds: imageIds,
  });

  await syncMediaUsage({
    entityType: 'product',
    entityId: existing._id,
    fieldName: 'assemblyGuide',
    previousMediaIds: previousGuideMediaIds,
    nextMediaIds: guideMediaIds,
  });

  revalidatePath('/inventory');
  revalidatePath(`/inventory/${sku}`);
  revalidatePath('/inventory/builds');
  return { success: true, message: 'Termék mentve.', sku };
}

export type ToggleProductActiveState = { success: boolean; message: string };

export async function toggleProductActiveAction(
  sku: string,
  isActive: boolean
): Promise<ToggleProductActiveState> {
  await requirePermission('inventory:write');
  await connectDB();

  const normalizedSku = sku.trim();
  if (!normalizedSku) {
    return { success: false, message: 'Hiányzó SKU.' };
  }

  const existing = await Product.findOne({ sku: normalizedSku }).exec();
  if (!existing) {
    return { success: false, message: 'Termék nem található.' };
  }

  const allowed = await canAccessProductWarehouses(
    (existing.warehouseIds ?? []).map((id) => String(id))
  );
  if (!allowed) {
    return { success: false, message: 'Nincs jogosultság ehhez a termékhez.' };
  }

  existing.isActive = isActive;
  await existing.save();
  revalidatePath('/inventory');
  revalidatePath(`/inventory/${normalizedSku}`);
  return {
    success: true,
    message: isActive ? 'Termék aktiválva.' : 'Termék inaktívvá téve.',
  };
}

export type BulkUpdateProductsState = {
  success: boolean;
  message: string;
  matched?: number;
  updated?: number;
};

export async function bulkUpdateProductsAction(
  formData: FormData
): Promise<BulkUpdateProductsState> {
  await requirePermission('inventory:write');
  const user = await requireAuth();
  if (!user?.id) return { success: false, message: 'Nincs bejelentkezve.' };

  await connectDB();

  const operationType = String(formData.get('operationType') ?? '').trim();
  const missingSupplierOnly = formData.get('missingSupplierOnly') === 'true';
  const brandFilter = String(formData.get('brandFilter') ?? '').trim() || undefined;
  const categorySlug =
    String(formData.get('categorySlug') ?? '')
      .trim()
      .toLowerCase() || undefined;

  let rawParams: Record<string, string | string[] | undefined> = {};
  const searchParamsJson = String(formData.get('searchParamsJson') ?? '').trim();
  if (searchParamsJson) {
    rawParams = JSON.parse(searchParamsJson) as Record<string, string | string[] | undefined>;
  }

  const scope = await getInventoryWarehouseScope();
  const showAllProducts =
    scope.isGlobal && typeof rawParams.showAll === 'string' && rawParams.showAll === 'true';
  const warehouseIdParam =
    typeof rawParams.warehouseId === 'string' ? rawParams.warehouseId : undefined;

  const query = parseDataTableQuery(rawParams);
  const { filter } = buildDataTableMongoQuery(query, INVENTORY_PRODUCT_COLUMNS);
  const activeFilter = showAllProducts ? {} : { isActive: true };
  let listFilter = await buildScopedProductFilter({ ...filter, ...activeFilter }, warehouseIdParam);

  const andClauses: Record<string, unknown>[] = [listFilter];

  if (missingSupplierOnly) {
    andClauses.push({
      $or: [{ supplierId: { $exists: false } }, { supplierId: null }],
    });
  }

  if (brandFilter) {
    andClauses.push({ brand: brandFilter });
  }

  if (categorySlug) {
    const cat = await Category.findOne({ slug: categorySlug }).select('_id').lean().exec();
    if (!cat) {
      return { success: false, message: `Ismeretlen kategória: ${categorySlug}` };
    }
    andClauses.push({ categoryIds: cat._id });
  }

  listFilter = andClauses.length === 1 ? andClauses[0]! : { $and: andClauses };

  let operation: BulkProductOperation;
  try {
    operation = buildBulkOperationFromForm(operationType, formData);
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Érvénytelen művelet.' };
  }

  try {
    const result = await applyBulkProductOperation(listFilter, operation, user.id, {
      isGlobal: scope.isGlobal,
      allowedWarehouseIds: scope.warehouseIds.map((id) => new mongoose.Types.ObjectId(id)),
    });

    revalidatePath('/inventory');
    return {
      success: true,
      message: formatBulkUpdateMessage(operation, result),
      matched: result.matched,
      updated: result.updated,
    };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'A művelet sikertelen.' };
  }
}

function buildBulkOperationFromForm(
  operationType: string,
  formData: FormData
): BulkProductOperation {
  switch (operationType) {
    case 'assignSupplier': {
      const supplierKey = String(formData.get('supplierKey') ?? '')
        .trim()
        .toLowerCase();
      if (!supplierKey) throw new Error('Válasszon beszállítót.');
      return { type: 'assignSupplier', supplierKey };
    }
    case 'setStock': {
      const warehouseKey = String(formData.get('stockWarehouseKey') ?? '')
        .trim()
        .toLowerCase();
      const quantity = Number(formData.get('stockQuantity'));
      const mode = String(formData.get('stockMode') ?? 'set') as 'set' | 'add';
      if (!warehouseKey) throw new Error('Válasszon raktárat a készlethez.');
      if (!Number.isFinite(quantity)) throw new Error('Érvénytelen mennyiség.');
      if (!['set', 'add'].includes(mode)) throw new Error('Érvénytelen készlet mód.');
      return { type: 'setStock', warehouseKey, quantity, mode };
    }
    case 'setActive': {
      const isActive = formData.get('isActive') === 'true';
      return { type: 'setActive', isActive };
    }
    case 'assignCategory': {
      const slug = String(formData.get('targetCategorySlug') ?? '')
        .trim()
        .toLowerCase();
      if (!slug) throw new Error('Adja meg a kategória slugot.');
      return { type: 'assignCategory', categorySlug: slug };
    }
    case 'setBrand': {
      const brand = String(formData.get('brand') ?? '').trim();
      return { type: 'setBrand', brand };
    }
    default:
      throw new Error('Ismeretlen művelet.');
  }
}

function formatBulkUpdateMessage(
  operation: BulkProductOperation,
  result: { matched: number; updated: number; stockLevelsTouched?: number }
): string {
  switch (operation.type) {
    case 'assignSupplier':
      return `${result.updated} / ${result.matched} termék — beszállító: ${operation.supplierKey}.`;
    case 'setStock':
      return `${result.stockLevelsTouched ?? result.updated} / ${result.matched} készletsor — ${operation.warehouseKey}: ${operation.mode === 'set' ? '=' : '+'}${operation.quantity}.`;
    case 'setActive':
      return `${result.updated} / ${result.matched} termék — ${operation.isActive ? 'aktív' : 'inaktív'}.`;
    case 'assignCategory':
      return `${result.updated} / ${result.matched} termék — kategória: ${operation.categorySlug}.`;
    case 'setBrand':
      return `${result.updated} / ${result.matched} termék — márka: ${operation.brand || '(törölve)'}.`;
    default:
      return `${result.updated} / ${result.matched} frissítve.`;
  }
}

export async function deleteProductAction(
  _prev: InventoryFormState,
  formData: FormData
): Promise<InventoryFormState> {
  await requirePermission('inventory:delete');
  await connectDB();

  const sku = String(formData.get('sku') ?? '').trim();
  const existing = await Product.findOne({ sku });
  if (!existing) return { success: false, message: 'A termék nem található.' };

  existing.isActive = false;
  await existing.save();
  revalidatePath('/inventory');
  return { success: true, message: 'Termék inaktiválva.', sku };
}

export type StockAdjustState = { success: boolean; message: string };

export async function adjustStockAction(
  _prev: StockAdjustState,
  formData: FormData
): Promise<StockAdjustState> {
  await requirePermission('inventory:write');
  const user = await requireAuth();
  if (!user) return { success: false, message: 'Nincs bejelentkezve.' };
  await connectDB();

  const parsed = stockAdjustmentSchema.safeParse({
    productId: formData.get('productId'),
    warehouseId: formData.get('warehouseId'),
    delta: formData.get('delta'),
    reason: formData.get('reason'),
    note: formData.get('note'),
  });

  if (!parsed.success) {
    return { success: false, message: 'Érvénytelen készlet módosítás.' };
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const productId = new mongoose.Types.ObjectId(parsed.data.productId);
      const warehouseId = new mongoose.Types.ObjectId(parsed.data.warehouseId);

      await Warehouse.findById(warehouseId).session(session);

      const stock = await StockLevel.findOneAndUpdate(
        { productId, warehouseId },
        {
          $inc: { onHand: parsed.data.delta },
          $set: { lastChangedAt: new Date(), lastChangedBy: user.id },
        },
        { upsert: true, new: true, session }
      );

      await StockAdjustment.create(
        [
          {
            productId,
            warehouseId,
            delta: parsed.data.delta,
            reason: parsed.data.reason,
            note: parsed.data.note,
            byUserId: user.id,
            at: new Date(),
          },
        ],
        { session }
      );

      // ensure onHand isn't negative in Phase 1
      if (stock.onHand < 0) {
        throw new Error('A készlet nem lehet negatív.');
      }

      await syncProductWarehouseIds(productId, session);
    });
  } catch (e: any) {
    return { success: false, message: e?.message ?? 'A készlet módosítása sikertelen.' };
  } finally {
    session.endSession();
  }

  revalidatePath('/inventory');
  return { success: true, message: 'Készlet módosítva.' };
}
