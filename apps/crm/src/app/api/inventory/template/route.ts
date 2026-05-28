import { NextResponse } from 'next/server';
import { requirePermission } from '@crm/auth';
import { getImportTemplateXlsx } from '@crm/core';

const MUNKA2_HELP: string[][] = [
  ['Oszlop / Column', 'Kötelező / Required', 'Leírás (HU)', 'Description (EN)'],
  [
    'product_id',
    'Igen / Yes',
    'Beszállítói cikkszám — ebből generálódik a CRM SKU',
    'Supplier SKU — used to generate CRM SKU',
  ],
  [
    'product_id_SM',
    'Opcionális',
    'Régi/ellenőrző mező — ha eltér a generált CRM SKU-tól, figyelmeztetés',
    'Optional legacy check against generated CRM SKU',
  ],
  [
    'crm_category_slug',
    'Igen / Yes',
    'CRM kategória slug (létező rekord)',
    'CRM category slug (must exist)',
  ],
  [
    'crm_supplier_slug',
    'Opcionális*',
    'Beszállító slug (Supplier.key) — soronként',
    'Supplier slug per row — for mixed-supplier files',
  ],
  ['name_hu', 'Ajánlott', 'Magyar terméknév', 'Hungarian product name'],
  [
    'cat1Name_hu',
    'Opcionális',
    'Beszállító 1. szintű kategória (HU)',
    'Shipper level-1 category (HU)',
  ],
  [
    'cat2Name_hu',
    'Opcionális',
    'Beszállító 2. szintű kategória (HU)',
    'Shipper level-2 category (HU)',
  ],
  [
    'cat3Name_hu',
    'Opcionális',
    'Beszállító 3. szintű kategória (HU)',
    'Shipper level-3 category (HU)',
  ],
  ['warehouse 1.', 'Opcionális', 'Készlet: Kispest raktár', 'Stock: warehouse 1 column'],
  ['warehouse 2.', 'Opcionális', 'Készlet: Erzsébet raktár', 'Stock: warehouse 2 column'],
  ['warehouse 3.', 'Opcionális', 'Készlet: Récsei raktár', 'Stock: warehouse 3 column'],
  [],
  [
    '* Beszállító',
    '',
    'Ha minden sorban van crm_supplier_slug, az import ablakban nem kell alapértelmezett. Egyébként válasszon alapértelmezett beszállítót, vagy töltse ki minden sort.',
    'Use crm_supplier_slug per row OR default supplier in import modal.',
  ],
  [
    'CRM kategória',
    '',
    'crm_category_slug = /inventory/categories slug. Nem hoz létre automatikusan CRM kategóriát.',
    'Categories must exist before import.',
  ],
];

export async function GET() {
  await requirePermission('inventory:import');

  const buffer = getImportTemplateXlsx(MUNKA2_HELP);
  return new NextResponse(Buffer.from(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="készlet-import-sablon.xlsx"',
    },
  });
}
