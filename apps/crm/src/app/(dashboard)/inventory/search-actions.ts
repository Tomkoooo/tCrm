'use server';

import { requirePermission } from '@crm/auth';
import { connectDB, Category, Product, Supplier } from '@crm/db';
import type { SearchItem } from '@/components/ui/search-autocomplete';
import { buildScopedProductFilter } from '@/lib/inventory/warehouse-scope';

export async function searchProductsAction(query: string): Promise<SearchItem[]> {
  await requirePermission('inventory:read');
  await connectDB();

  const q = query.trim();
  if (!q) return [];

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
    .select('sku internalSku names brand')
    .limit(20)
    .lean()
    .exec();

  return products.map((p) => ({
    value: String(p._id),
    label: p.sku,
    sublabel: [p.supplierSku, p.names?.hu ?? p.names?.en].filter(Boolean).join(' · ') || p.brand,
    raw: p,
  }));
}

export async function searchSuppliersAction(query: string): Promise<SearchItem[]> {
  await requirePermission('inventory:read');
  await connectDB();

  const q = query.trim();
  if (!q) return [];

  const suppliers = await Supplier.find({
    $or: [{ key: { $regex: q, $options: 'i' } }, { name: { $regex: q, $options: 'i' } }],
  })
    .limit(20)
    .lean()
    .exec();

  return suppliers.map((s) => ({
    value: s.key,
    label: s.name,
    sublabel: s.key,
    raw: s,
  }));
}

export async function searchCategoriesAction(query: string): Promise<SearchItem[]> {
  await requirePermission('inventory:read');
  await connectDB();

  const q = query.trim();
  if (!q) return [];

  const categories = await Category.find({
    $or: [
      { slug: { $regex: q, $options: 'i' } },
      { 'names.hu': { $regex: q, $options: 'i' } },
      { 'names.en': { $regex: q, $options: 'i' } },
    ],
  })
    .limit(20)
    .lean()
    .exec();

  return categories.map((c) => ({
    value: c.slug,
    label: c.names?.hu ?? c.names?.en ?? c.slug,
    sublabel: `Szint ${c.level} · ${c.slug}`,
    raw: c,
  }));
}

export async function searchWarehousesAction(query: string): Promise<SearchItem[]> {
  await requirePermission('inventory:read');
  await connectDB();

  const { getInventoryWarehouseScope } = await import('@/lib/inventory/warehouse-scope');
  const scope = await getInventoryWarehouseScope();

  const q = query.trim().toLowerCase();
  const list = scope.warehouses.filter(
    (w) => !q || w.name.toLowerCase().includes(q) || w.key.toLowerCase().includes(q)
  );

  return list.slice(0, 20).map((w) => ({
    value: w.key,
    label: w.name,
    sublabel: w.key,
  }));
}
