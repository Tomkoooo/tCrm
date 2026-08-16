import * as XLSX from 'xlsx';
import { INVENTORY_COLUMNS } from './excel-columns';

export const IMPORT_TEMPLATE_SHEET = 'Termékek';
export const IMPORT_GUIDE_SHEET = 'Útmutató';

function emptyRow(): Record<string, string | number> {
  const row: Record<string, string | number> = {};
  for (const col of INVENTORY_COLUMNS) {
    row[col] = '';
  }
  return row;
}

/** Example row aligned with current import parser (stock-driven warehouses). */
function buildExampleRow(): Record<string, string | number> {
  const row = emptyRow();
  row.product_id = '3301';
  row.crm_category_slug = 'pelda-kategoria';
  row.crm_supplier_slug = 'pelda-beszallito';
  row.name_hu = 'Minta termék';
  row.name_en = 'Sample product';
  row.name_de = 'Beispielprodukt';
  row.brand = 'Minta márka';
  row['warehouse 1.'] = 10;
  row['warehouse 2.'] = 0;
  return row;
}

function buildGuideRows(): string[][] {
  return [
    ['Oszlop', 'Kötelező', 'Leírás'],
    [
      'product_id',
      'Igen',
      'Beszállítói cikkszám. A CRM SKU = kategória skuPrefix + product_id (generálás importkor).',
    ],
    [
      'crm_category_slug',
      'Igen',
      'Létező CRM kategória slug — hozza létre előbb: Termékkategóriák (/inventory/categories).',
    ],
    [
      'product_id_SM',
      'Nem',
      'Opcionális ellenőrzés. Ha eltér a generált CRM SKU-tól, figyelmeztetés kerül az előnézetbe.',
    ],
    [
      'crm_supplier_slug',
      'Nem',
      'Beszállító slug (Supplier.key). Üres sor + import „beszállító nélkül” → később tömeges hozzárendelés.',
    ],
    [
      'crm_warehouse_slug',
      'Nem',
      'Nincs hatása — raktár jelenlét csak a warehouse 1./2./3. készlet oszlopokból származik.',
    ],
    [
      'warehouse 1.',
      'Nem',
      'Kispest raktár (kulcs: kispest). Üres cella = nincs készlet / nincs a raktárban. 0 = van StockLevel, 0 db.',
    ],
    ['warehouse 2.', 'Nem', 'Erzsébet raktár (kulcs: erzsebet).'],
    ['warehouse 3.', 'Nem', 'Récsei raktár (kulcs: recsei).'],
    ['name_hu / name_en / name_de', 'Ajánlott', 'Termék megnevezések nyelvenként.'],
    [
      'Relatedproduct_1 + Relatedproduct_pc_1',
      'Nem',
      'BOM: kapcsolódó termék CRM SKU + darabszám.',
    ],
    [],
    ['Import lépések', '', ''],
    ['1', '', 'Töltse ki a Termékek lapot (sorok az oszlopfejlécek alatt).'],
    ['2', '', 'Készlet → Importálás → fájl feltöltés → előnézet → mentés.'],
    ['3', '', 'Nincs kötelező alapértelmezett raktár a varázslóban.'],
  ];
}

export function getImportTemplateXlsx(): ArrayBuffer {
  const wb = XLSX.utils.book_new();

  const ws = XLSX.utils.json_to_sheet([buildExampleRow()], { header: [...INVENTORY_COLUMNS] });
  XLSX.utils.book_append_sheet(wb, ws, IMPORT_TEMPLATE_SHEET);

  const guideWs = XLSX.utils.aoa_to_sheet(buildGuideRows());
  XLSX.utils.book_append_sheet(wb, guideWs, IMPORT_GUIDE_SHEET);

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
