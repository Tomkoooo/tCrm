#!/usr/bin/env node
/**
 * Turns the raw Steinigke/ALUTRUSS export into a workbook the CRM's
 * "Import Excelből" function accepts (the INVENTORY_COLUMNS shape from
 * `packages/inventory/src/excel-columns.ts`, i.e. the layout documented in
 * `docs/Steinigke_táblázat generator.xlsx` → sheet "Munka2").
 *
 * Usage:
 *   node scripts/build-steinigke-import.mjs [--rate 369.18] [--out docs/steinigke-import.xlsx]
 *
 * What it does beyond reshaping columns:
 *   - fills the Hungarian name and category columns from a reviewed dictionary
 *   - derives the HUF price columns (see HUF_FORMULA below)
 *   - drops the placeholder rows marked "NINCS ILYEN TERMEK A FORRASFAJLBAN"
 *   - writes a second sheet recording the rate, formulas and row decisions
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SOURCE_FILE = path.join(ROOT, 'docs/SteinigkeDE_szurt.xlsx');
const SOURCE_SHEET = 'Termekek';
const DEFAULT_OUT = path.join(ROOT, 'docs/steinigke-import.xlsx');

/** Keep in sync with `packages/inventory/src/excel-columns.ts`. */
const INVENTORY_COLUMNS = [
  'product_id_SM',
  'product_id',
  'supplierNo',
  'brand',
  'name_de',
  'name_en',
  'name_hu',
  'ean',
  'length',
  'width',
  'height',
  'weight',
  'Color_de',
  'Color_en',
  'Color_hu',
  'packageweight',
  'packagevolume',
  'long_description_de',
  'long_description_en',
  'long_description_hu',
  'recommendet_retail_price_with_german_tax',
  'recommendet_retail_price_with_tax_HUF',
  'streetprice_with_german_tax',
  'streetprice_without_HUN_tax_HUF',
  'merchant_price',
  'merchant_price_HUF',
  'youtubevideo',
  'bild1',
  'bild2',
  'bild3',
  'bild4',
  'bild5',
  'freightlevel',
  'stocklevel',
  'availability_in_weeks',
  'youtubeid',
  'categoriy2_id',
  'cat1Name',
  'cat2Name',
  'Cat3Name',
  'inCategories',
  'crm_category_slug',
  'crm_supplier_slug',
  'crm_warehouse_slug',
  'is_consumable',
  'discontinued',
  'cat1Name_en',
  'cat2Name_en',
  'cat3Name_en',
  'cat1Name_hu',
  'cat2Name_hu',
  'cat3Name_hu',
  'Relatedproduct_1',
  'Relatedproduct_pc_1',
  'Relatedproduct_2',
  'Relatedproduct_pc_2',
  'Relatedproduct_3',
  'Relatedproduct_pc_3',
  'Relatedproduct_4',
  'Relatedproduct_pc_4',
  'Owner',
  'warehouse 1.',
  'warehouse 2.',
  'warehouse 3.',
  'RentFeeDay',
  'RentFeeWeekend',
  'RentFeeWeek',
  'Discont 1.',
  'Discont 2.',
  'Rent',
];

/** All rows are ALUTRUSS truss → the `traverz` CRM category (SKU prefix 9, length 9). */
const CRM_CATEGORY_SLUG = 'traverz';
const CRM_SUPPLIER_SLUG = 'steinigke';

/** Pricing rules from `docs/Steinigke_táblázat generator.xlsx` sheet "Munka2". */
const GERMAN_VAT = 1.19;
const HUNGARIAN_VAT = 1.27;
const HUF_FORMULA = {
  recommendet_retail_price_with_tax_HUF:
    'recommendet_retail_price_with_german_tax / 1.19 * 1.27 * rate (bruttó HUF)',
  streetprice_without_HUN_tax_HUF: 'streetprice_with_german_tax / 1.19 * rate (nettó HUF)',
  merchant_price_HUF: 'merchant_price * rate (nettó HUF, a beszerzési ár már ÁFA nélküli)',
};

/**
 * Hungarian translations of the trailing product descriptor, keyed by the German
 * text after the `ALUTRUSS <SYSTEM> <MODEL>` prefix. 21 distinct values cover all
 * 50 products; the model code is never translated.
 */
const DESCRIPTOR_HU = {
  'QUICK-LOCK Rohr': 'QUICK-LOCK cső',
  '2-Punkt-Traverse': '2 pontos traverz',
  '3-Punkt-Traverse': '3 pontos traverz',
  '3-Punkt Traverse': '3 pontos traverz',
  '4-Punkt-Traverse': '4 pontos traverz',
  '3-Weg-T-Stück': '3 irányú T-elem',
  '3-Wege-T-Stück': '3 irányú T-elem',
  '3-Wege-T-stück 90°': '3 irányú T-elem 90°',
  '2-Wege-Ecke 90°': '2 irányú sarokelem 90°',
  '2-Weg-Ecke 90° /\\': '2 irányú sarokelem 90° /\\',
  '2-Wege-Ecke 135°': '2 irányú sarokelem 135°',
  '3-Wege-Ecke 90°': '3 irányú sarokelem 90°',
  '3-Weg-Ecke \\/ links': '3 irányú sarokelem \\/ bal',
  '3-Weg-Ecke \\/ rechts': '3 irányú sarokelem \\/ jobb',
  '3-Weg-Ecke /\\ links': '3 irányú sarokelem /\\ bal',
  '3-Weg-Ecke /\\ rechts': '3 irányú sarokelem /\\ jobb',
  '4-Weg-Stück \\/': '4 irányú elem \\/',
  'Universal-Kreuzstück': 'univerzális keresztelem',
  'Element f.Kreis 4m in.90°': 'körelem 4 m, belső 90°',
  'Kreiselement 4m in.90° /\\': 'körelem 4 m, belső 90° /\\',
  'Element f.Kreis 6m in.45°': 'körelem 6 m, belső 45°',
};

const CATEGORY_HU = {
  Hardware: 'Hardver',
  Traversen: 'Traverz',
  '1-Punkt-Systeme': '1 pontos rendszerek',
  '2-Punkt-Systeme': '2 pontos rendszerek',
  '3-Punkt-Systeme': '3 pontos rendszerek',
  '4-Punkt-Systeme': '4 pontos rendszerek',
};

function parseArgs(argv) {
  const args = { rate: 369.18, out: DEFAULT_OUT };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--rate') args.rate = Number(argv[++i]);
    else if (argv[i] === '--out') args.out = path.resolve(ROOT, argv[++i]);
  }
  if (!Number.isFinite(args.rate) || args.rate <= 0) {
    throw new Error(`Invalid --rate: ${args.rate}`);
  }
  return args;
}

function text(value) {
  if (value === null || value === undefined) return '';
  const s = String(value).trim();
  return s === '-' ? '' : s;
}

function num(value) {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** `ALUTRUSS QUADLOCK 6082-500 4-Punkt-Traverse` → Hungarian, or '' when unmapped. */
export function translateProductName(nameDe, unmapped) {
  const name = text(nameDe);
  if (!name) return '';

  const match = name.match(/^(ALUTRUSS\s+\S+\s+\S+)\s*(.*)$/);
  if (!match) {
    unmapped?.push(name);
    return '';
  }

  const [, prefix, descriptor] = match;
  if (!descriptor) return prefix;

  const hu = DESCRIPTOR_HU[descriptor];
  if (!hu) {
    unmapped?.push(descriptor);
    return '';
  }
  return `${prefix} ${hu}`;
}

function hufFromGross(grossEur, rate) {
  const value = num(grossEur);
  if (value === undefined) return '';
  return Math.round((value / GERMAN_VAT) * HUNGARIAN_VAT * rate);
}

function hufNetFromGross(grossEur, rate) {
  const value = num(grossEur);
  if (value === undefined) return '';
  return Math.round((value / GERMAN_VAT) * rate);
}

function hufFromNet(netEur, rate) {
  const value = num(netEur);
  if (value === undefined) return '';
  return Math.round(value * rate);
}

function buildRow(source, rate, unmapped) {
  const row = {};
  for (const column of INVENTORY_COLUMNS) row[column] = '';

  row.product_id = text(source.product_id);
  row.brand = text(source.brand);
  row.name_de = text(source.name_de);
  row.name_en = text(source.name_en);
  row.name_hu = translateProductName(source.name_de, unmapped);
  row.ean = text(source.ean);

  // Dimensions arrive in metres and are stored as given, matching the existing
  // catalogue in this database (the model field name says mm, the data is metres).
  row.length = num(source.length) ?? '';
  row.width = num(source.width) ?? '';
  row.height = num(source.height) ?? '';
  row.weight = num(source.weight) ?? '';
  row.packageweight = num(source.packageweight) ?? '';
  row.packagevolume = num(source.packagevolume) ?? '';

  row.long_description_de = text(source.long_description_de);
  row.long_description_en = text(source.long_description_en);

  row.recommendet_retail_price_with_german_tax =
    num(source.recommendet_retail_price_with_german_tax) ?? '';
  row.recommendet_retail_price_with_tax_HUF = hufFromGross(
    source.recommendet_retail_price_with_german_tax,
    rate
  );
  row.streetprice_with_german_tax = num(source.streetprice_with_german_tax) ?? '';
  row.streetprice_without_HUN_tax_HUF = hufNetFromGross(source.streetprice_with_german_tax, rate);
  row.merchant_price = num(source.merchant_price) ?? '';
  row.merchant_price_HUF = hufFromNet(source.merchant_price, rate);

  row.youtubevideo = text(source.youtubevideo);
  row.youtubeid = text(source.youtubeid);
  for (const n of [1, 2, 3, 4, 5]) row[`bild${n}`] = text(source[`bild${n}`]);

  // freightlevel is a letter in the source (K/G/S) but numeric in the CRM model,
  // so it is carried in the shipper category block instead of silently becoming NaN.
  row.stocklevel = num(source.stocklevel) ?? '';
  row.availability_in_weeks = num(source.availability_in_weeks) ?? '';

  row.categoriy2_id = text(source.categoriy2_id);
  row.cat1Name = text(source.cat1Name);
  row.cat2Name = text(source.cat2Name);
  row.Cat3Name = text(source.Cat3Name);
  row.cat1Name_en = text(source.cat1Name_en);
  row.cat2Name_en = text(source.cat2Name_en);
  row.cat3Name_en = text(source.cat3Name_en);
  row.cat1Name_hu = CATEGORY_HU[text(source.cat1Name)] ?? '';
  row.cat2Name_hu = CATEGORY_HU[text(source.cat2Name)] ?? '';
  row.cat3Name_hu = CATEGORY_HU[text(source.Cat3Name)] ?? '';
  row.inCategories = text(source.inCategories);

  row.crm_category_slug = CRM_CATEGORY_SLUG;
  row.crm_supplier_slug = CRM_SUPPLIER_SLUG;
  row.discontinued = num(source.discontinued) ?? 0;
  row.is_consumable = 0;

  return row;
}

function main() {
  const { rate, out } = parseArgs(process.argv.slice(2));

  const wb = XLSX.readFile(SOURCE_FILE);
  const ws = wb.Sheets[SOURCE_SHEET];
  if (!ws) throw new Error(`Sheet not found: ${SOURCE_SHEET}`);
  const sourceRows = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const rows = [];
  const decisions = [];
  const unmapped = [];

  sourceRows.forEach((source, index) => {
    const sourceRowNumber = index + 2;
    const productId = text(source.product_id);
    const note = text(source.megjegyzes);

    if (!productId) {
      decisions.push({ source_row: sourceRowNumber, product_id: '', action: 'kihagyva', reason: 'nincs product_id' });
      return;
    }
    if (!text(source.name_de) && !text(source.name_en)) {
      decisions.push({
        source_row: sourceRowNumber,
        product_id: productId,
        action: 'kihagyva',
        reason: note || 'nincs megnevezés a forrásfájlban',
      });
      return;
    }

    rows.push(buildRow(source, rate, unmapped));
    decisions.push({
      source_row: sourceRowNumber,
      product_id: productId,
      action: 'importálva',
      reason: note || '',
    });
  });

  if (unmapped.length) {
    throw new Error(
      `Missing Hungarian translation for descriptor(s): ${[...new Set(unmapped)].join(' | ')}`
    );
  }

  // Letters in the supplier SKU must survive into the CRM SKU, or 6030649A and
  // 6030649B collapse onto one product. Flagged here so the import run matches.
  const alphanumeric = rows.map((r) => r.product_id).filter((id) => /[^0-9]/.test(id));

  const outWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    outWb,
    XLSX.utils.json_to_sheet(rows, { header: INVENTORY_COLUMNS }),
    'Termekek'
  );

  const meta = [
    { kulcs: 'generálva', ertek: new Date().toISOString() },
    { kulcs: 'forrásfájl', ertek: path.relative(ROOT, SOURCE_FILE) },
    { kulcs: 'EUR/HUF árfolyam', ertek: rate },
    { kulcs: 'CRM kategória slug', ertek: CRM_CATEGORY_SLUG },
    { kulcs: 'CRM beszállító slug', ertek: CRM_SUPPLIER_SLUG },
    { kulcs: 'importálható sorok', ertek: rows.length },
    { kulcs: 'kihagyott sorok', ertek: decisions.filter((d) => d.action === 'kihagyva').length },
    {
      kulcs: 'betűt tartalmazó beszállítói SKU',
      ertek: alphanumeric.join(', ') || '—',
    },
    {
      kulcs: 'megjegyzés',
      ertek:
        'Betűs beszállítói SKU esetén az importnál a „betűk megőrzése" opció kell, különben egy SKU-ra esnek.',
    },
    ...Object.entries(HUF_FORMULA).map(([kulcs, ertek]) => ({ kulcs, ertek })),
  ];
  XLSX.utils.book_append_sheet(outWb, XLSX.utils.json_to_sheet(meta), 'Import info');
  XLSX.utils.book_append_sheet(outWb, XLSX.utils.json_to_sheet(decisions), 'Sorok');

  XLSX.writeFile(outWb, out);

  console.log(`Wrote ${path.relative(ROOT, out)}`);
  console.log(`  importable rows : ${rows.length}`);
  console.log(`  skipped rows    : ${decisions.filter((d) => d.action === 'kihagyva').length}`);
  console.log(`  EUR/HUF rate    : ${rate}`);
  console.log(`  alphanumeric ids: ${alphanumeric.join(', ') || '(none)'}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
