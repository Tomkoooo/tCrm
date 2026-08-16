import * as XLSX from 'xlsx';
import type { IProduct } from '@crm/db-core';
import { INVENTORY_COLUMNS } from './excel-columns';
import { excelColumnFromWarehouseKey } from './warehouse-columns';

export type InventoryExportEnrichment = {
  warehouseSlugByProductId?: Map<string, string>;
  categorySlugByProductId?: Map<string, string>;
  supplierKeyByProductId?: Map<string, string>;
  /** productId → warehouseKey → onHand */
  stockByProductId?: Map<string, Map<string, number>>;
  /** Stock columns to populate (warehouse keys, e.g. kispest, erzsebet, recsei). */
  stockWarehouseKeys?: string[];
  componentLinesByProductId?: Map<string, Array<{ sku: string; quantity: number }>>;
};

export function exportInventoryXlsx(
  products: Array<Partial<IProduct>>,
  enrichment?: InventoryExportEnrichment
): ArrayBuffer {
  const stockKeys = enrichment?.stockWarehouseKeys ?? [];

  const rows: Record<string, unknown>[] = products.map((p) => {
    const productId = p._id ? String(p._id) : '';
    const row: Record<string, unknown> = {};

    row.product_id_SM = p.sku ?? '';
    row.product_id = p.supplierSku ?? '';
    row.supplierNo = p.supplierNo ?? '';
    row.brand = p.brand ?? '';
    row.name_de = p.names?.de ?? '';
    row.name_en = p.names?.en ?? '';
    row.name_hu = p.names?.hu ?? '';
    row.ean = p.ean ?? '';
    row.length = p.dimensionsMm?.length ?? '';
    row.width = p.dimensionsMm?.width ?? '';
    row.height = p.dimensionsMm?.height ?? '';
    row.weight = p.weightKg ?? '';
    row.Color_de = p.colors?.de ?? '';
    row.Color_en = p.colors?.en ?? '';
    row.Color_hu = p.colors?.hu ?? '';
    row.packageweight = p.packageWeightKg ?? '';
    row.packagevolume = p.packageVolumeM3 ?? '';
    row.long_description_de = p.descriptions?.de ?? '';
    row.long_description_en = p.descriptions?.en ?? '';
    row.long_description_hu = p.descriptions?.hu ?? '';
    row.recommendet_retail_price_with_german_tax = p.pricing?.recommendedRetailPriceEur ?? '';
    row.recommendet_retail_price_with_tax_HUF = p.pricing?.recommendedRetailPriceHuf ?? '';
    row.streetprice_with_german_tax = p.pricing?.streetPriceEur ?? '';
    row.streetprice_without_HUN_tax_HUF = p.pricing?.streetPriceHuf ?? '';
    row.merchant_price = p.pricing?.merchantPriceEur ?? '';
    row.merchant_price_HUF = p.pricing?.merchantPriceHuf ?? '';
    row.youtubevideo = p.youtubeVideo ?? '';
    row.youtubeid = p.youtubeId ?? '';

    const hints = p.externalImageHints ?? [];
    row.bild1 = hints[0] ?? '';
    row.bild2 = hints[1] ?? '';
    row.bild3 = hints[2] ?? '';
    row.bild4 = hints[3] ?? '';
    row.bild5 = hints[4] ?? '';

    row.freightlevel = p.freightLevel ?? '';
    row.stocklevel = p.stockLevelHint ?? '';
    row.availability_in_weeks = p.availabilityWeeks ?? '';

    row.categoriy2_id = '';
    row.cat1Name = p.shipperCategoryPath?.cat1?.de ?? '';
    row.cat2Name = p.shipperCategoryPath?.cat2?.de ?? '';
    row.Cat3Name = p.shipperCategoryPath?.cat3?.de ?? '';
    row.inCategories = p.inCategories ?? '';
    row.crm_category_slug =
      (productId && enrichment?.categorySlugByProductId?.get(productId)) ?? '';
    row.crm_supplier_slug = (productId && enrichment?.supplierKeyByProductId?.get(productId)) ?? '';
    row.crm_warehouse_slug =
      (productId && enrichment?.warehouseSlugByProductId?.get(productId)) ?? '';
    row.is_consumable = p.isConsumable ? 1 : '';
    row.discontinued = p.isDiscontinued ? 1 : 0;
    row.cat1Name_en = p.shipperCategoryPath?.cat1?.en ?? '';
    row.cat2Name_en = p.shipperCategoryPath?.cat2?.en ?? '';
    row.cat3Name_en = p.shipperCategoryPath?.cat3?.en ?? '';
    row.cat1Name_hu = p.shipperCategoryPath?.cat1?.hu ?? '';
    row.cat2Name_hu = p.shipperCategoryPath?.cat2?.hu ?? '';
    row.cat3Name_hu = p.shipperCategoryPath?.cat3?.hu ?? '';

    const components = enrichment?.componentLinesByProductId?.get(productId) ?? [];
    for (let i = 0; i < 4; i++) {
      const c = components[i];
      row[`Relatedproduct_${i + 1}`] = c?.sku ?? '';
      row[`Relatedproduct_pc_${i + 1}`] = c?.quantity ?? '';
    }

    row.Owner = p.owner ?? '';
    row['warehouse 1.'] = '';
    row['warehouse 2.'] = '';
    row['warehouse 3.'] = '';

    const stockForProduct = enrichment?.stockByProductId?.get(productId);
    if (stockForProduct && stockKeys.length) {
      for (const whKey of stockKeys) {
        const col = excelColumnFromWarehouseKey(whKey);
        if (!col) continue;
        const qty = stockForProduct.get(whKey);
        if (qty !== undefined) row[col] = qty;
      }
    }

    row.RentFeeDay = p.rental?.rentFeeDay ?? '';
    row.RentFeeWeekend = p.rental?.rentFeeWeekend ?? '';
    row.RentFeeWeek = p.rental?.rentFeeWeek ?? '';
    row['Discont 1.'] = p.discounts?.discount1Max ?? '';
    row['Discont 2.'] = p.discounts?.discount2Owner ?? '';
    row.Rent = p.rental?.rentFlag ?? '';

    const ordered: Record<string, unknown> = {};
    for (const col of INVENTORY_COLUMNS) {
      ordered[col] = row[col] ?? '';
    }
    return ordered;
  });

  const ws = XLSX.utils.json_to_sheet(rows, { header: [...INVENTORY_COLUMNS] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Export');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
