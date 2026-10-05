/**
 * Runs the generated Steinigke workbook through the same code path as the
 * "Import Excelből" server action, so what this script does and what the UI does
 * cannot drift apart.
 *
 *   MONGODB_URI=... MONGODB_DB_NAME=sakkmed_crm \
 *     pnpm --filter @crm/app tsx scripts/import-steinigke.ts --dry-run
 *
 * Flags:
 *   --dry-run        parse + prepare only, write nothing (default)
 *   --supplier-only  create the Steinigke supplier record, then dry-run the rows
 *   --commit         actually write products, categories and supplier links
 *   --file           workbook path (default: docs/steinigke-import.xlsx)
 */
import path from 'node:path';
import process from 'node:process';
import { readFile } from 'node:fs/promises';
import { connectDB, Product, Supplier, User } from '@crm/db-core';
import {
  commitInventoryImport,
  parseInventoryXlsx,
  prepareImportRows,
  type ImportCommitOptions,
} from '@crm/inventory';

const ROOT = path.resolve(import.meta.dirname, '../../..');

const SUPPLIER_KEY = 'steinigke';

/** From `docs/Steinigke_táblázat generator.xlsx` → sheet "Partner info". */
const SUPPLIER_DATA = {
  key: SUPPLIER_KEY,
  name: 'Steinigke Showtechnic GmbH',
  address: 'Andreas-Bauer-Str. 5',
  city: 'Waldbüttelbrunn',
  postalCode: '97297',
  country: 'Germany',
  phone: '+49 931 4061 600',
  email: 'info@steinigke.de',
  euTaxNo: 'DE160449806',
  registry: 'Register: Würzburg HR B 4703 · WEEE-Nr.: 18776746',
  contacts: [
    { role: 'Ügyvezető', name: 'Matthias Schwab' },
    {
      role: 'Értékesítés',
      name: 'Eveline Rimac-Juhász',
      email: 'eveline.rimac-juhasz@steinigke.de',
    },
  ],
};

const IMPORT_OPTIONS: ImportCommitOptions = {
  sheetName: 'Termekek',
  defaultSupplierKey: SUPPLIER_KEY,
  matchKey: 'sku',
  // Re-runnable: an existing product is updated rather than skipped.
  isMerge: true,
  skuMode: 'from_supplier_sku',
  // 6030649A / 6030649B are distinct products; stripping the letter merges them.
  preserveSupplierSkuLetters: true,
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function ensureSupplier(commit: boolean) {
  const existing = await Supplier.findOne({ key: SUPPLIER_KEY }).lean().exec();
  if (existing) {
    console.log(`supplier: "${SUPPLIER_KEY}" already exists (${existing.name})`);
    return;
  }
  if (!commit) {
    console.log(`supplier: "${SUPPLIER_KEY}" would be created (${SUPPLIER_DATA.name})`);
    return;
  }
  await Supplier.create(SUPPLIER_DATA);
  console.log(`supplier: created "${SUPPLIER_KEY}" (${SUPPLIER_DATA.name})`);
}

async function resolveActorUserId(): Promise<string> {
  const explicit = arg('actor');
  if (explicit) return explicit;

  // Stock adjustments need an author; fall back to any active admin-ish account.
  const user = await User.findOne({ isActive: true }).select({ _id: 1, email: 1 }).lean().exec();
  if (!user) throw new Error('No active user found to attribute the import to (use --actor <id>).');
  console.log(`actor: ${user.email}`);
  return String(user._id);
}

async function main() {
  const commit = process.argv.includes('--commit');
  const supplierOnly = process.argv.includes('--supplier-only');
  const file = path.resolve(ROOT, arg('file') ?? 'docs/steinigke-import.xlsx');

  console.log(
    `mode  : ${commit ? 'COMMIT' : supplierOnly ? 'DRY RUN (+ create supplier)' : 'DRY RUN'}`
  );
  console.log(`file  : ${path.relative(ROOT, file)}`);
  console.log(`db    : ${process.env.MONGODB_DB_NAME}\n`);

  await connectDB();
  await ensureSupplier(commit || supplierOnly);

  const buffer = await readFile(file);
  const parsed = await parseInventoryXlsx(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer,
    IMPORT_OPTIONS
  );

  console.log(`\nparsed: ${parsed.rows.length} rows, ${parsed.errors.length} errors`);
  for (const issue of parsed.errors) {
    console.log(`  ERROR row ${issue.row} [${issue.field ?? '-'}]: ${issue.message}`);
  }

  const prepared = await prepareImportRows(parsed, SUPPLIER_KEY, IMPORT_OPTIONS);
  console.log(`ready : ${prepared.ready.length}, skipped: ${prepared.skipped.length}`);
  for (const issue of prepared.skipped) {
    console.log(`  SKIP row ${issue.row} [${issue.field ?? '-'}]: ${issue.message}`);
  }

  const interestingWarnings = prepared.warnings.filter(
    (w) => w.message !== 'Unknown column will be ignored'
  );
  if (interestingWarnings.length) {
    console.log(`\nwarnings (${interestingWarnings.length}):`);
    for (const issue of interestingWarnings.slice(0, 20)) {
      console.log(`  WARN row ${issue.row} [${issue.field ?? '-'}]: ${issue.message}`);
    }
  }

  console.log('\nCRM SKU mapping:');
  for (const row of prepared.ready) {
    console.log(`  ${row.product.supplierSku?.padEnd(10)} → ${row.product.sku}`);
  }

  const skus = prepared.ready.map((r) => r.product.sku);
  const duplicates = skus.filter((s, i) => skus.indexOf(s) !== i);
  if (duplicates.length) {
    console.error(`\nABORT: duplicate CRM SKUs in batch: ${[...new Set(duplicates)].join(', ')}`);
    process.exit(1);
  }

  if (!commit) {
    console.log('\nDry run — nothing written. Re-run with --commit to apply.');
    process.exit(0);
  }

  const actorUserId = await resolveActorUserId();
  const report = await commitInventoryImport(
    { rows: prepared.ready, errors: [], warnings: prepared.warnings },
    actorUserId,
    IMPORT_OPTIONS
  );

  console.log('\nimport report:');
  console.log(`  created          : ${report.created}`);
  console.log(`  updated          : ${report.updated}`);
  console.log(`  category upserts : ${report.categoryUpserts}`);
  console.log(`  stock upserts    : ${report.stockUpserts}`);
  console.log(`  skipped          : ${report.skipped}`);

  const total = await Product.countDocuments({ brand: 'ALUTRUSS' });
  console.log(`\nALUTRUSS products now in ${process.env.MONGODB_DB_NAME}: ${total}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
