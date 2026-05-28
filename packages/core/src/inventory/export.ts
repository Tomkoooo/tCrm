import * as XLSX from 'xlsx';
import type { IProduct } from '@crm/db';
import { ALUTENT_COLUMNS } from './excel-columns';

export function exportInventoryXlsx(products: Array<Partial<IProduct>>): ArrayBuffer {
  const rows: Record<string, unknown>[] = products.map((p) => {
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

    // Categories and warehouses are exported by the export endpoint that joins category/stock.
    // Leave these blank here; caller can override by mutating returned row before writing.
    row.categoriy2_id = '';
    row.cat1Name = '';
    row.cat2Name = '';
    row.Cat3Name = '';
    row.inCategories = p.inCategories ?? '';
    row.discontinued = p.isDiscontinued ? 1 : 0;
    row.cat1Name_en = '';
    row.cat2Name_en = '';
    row.cat3Name_en = '';
    row.cat1Name_hu = '';
    row.cat2Name_hu = '';
    row.cat3Name_hu = '';

    for (let i = 0; i < 4; i++) {
      row[`Relatedproduct_${i + 1}`] = '';
      row[`Relatedproduct_pc_${i + 1}`] = '';
    }
    // Caller can fill BOM with SKU via lookup. We keep placeholders.

    row.Owner = p.owner ?? '';
    row['warehouse 1.'] = '';
    row['warehouse 2.'] = '';
    row['warehouse 3.'] = '';

    row.RentFeeDay = p.rental?.rentFeeDay ?? '';
    row.RentFeeWeekend = p.rental?.rentFeeWeekend ?? '';
    row.RentFeeWeek = p.rental?.rentFeeWeek ?? '';
    row['Discont 1.'] = p.discounts?.discount1Max ?? '';
    row['Discont 2.'] = p.discounts?.discount2Owner ?? '';
    row.Rent = p.rental?.rentFlag ?? '';

    // Ensure column order matches Alutent
    const ordered: Record<string, unknown> = {};
    for (const col of ALUTENT_COLUMNS) {
      ordered[col] = row[col] ?? '';
    }
    return ordered;
  });

  const ws = XLSX.utils.json_to_sheet(rows, { header: [...ALUTENT_COLUMNS] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Munka1');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return out;
}

export function getImportTemplateXlsx(munka2Rows: string[][]): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet([[...ALUTENT_COLUMNS]]);
  XLSX.utils.book_append_sheet(wb, ws1, 'Munka1');

  const ws2 = XLSX.utils.aoa_to_sheet(munka2Rows);
  XLSX.utils.book_append_sheet(wb, ws2, 'Munka2');

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
