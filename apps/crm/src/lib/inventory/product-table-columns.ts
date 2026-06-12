import { productNameFromParts, type ProductBomRole } from '@crm/lib';
import type { ColumnDef } from '@crm/ui';
import { countProductImages } from '@/lib/product-thumbnail';

export function productTableRowDisplayName(
  row: Pick<ProductTableRow, 'name_hu' | 'name_en' | 'name_de' | 'sku'>
): string {
  return productNameFromParts(row);
}

export type ProductTableRow = {
  sku: string;
  internalSku?: string;
  supplierSku?: string;
  supplierNo?: string;
  brand?: string;
  ean?: string;
  name_hu?: string;
  name_en?: string;
  name_de?: string;
  color_hu?: string;
  color_en?: string;
  color_de?: string;
  desc_hu?: string;
  desc_en?: string;
  desc_de?: string;
  length?: number;
  width?: number;
  height?: number;
  weightKg?: number;
  packageWeightKg?: number;
  packageVolumeM3?: number;
  priceRetailEur?: number;
  priceRetailHuf?: number;
  priceStreetEur?: number;
  priceStreetHuf?: number;
  priceMerchantEur?: number;
  priceMerchantHuf?: number;
  freightLevel?: number;
  stockLevelHint?: number;
  availabilityWeeks?: number;
  youtubeId?: string;
  youtubeVideo?: string;
  inCategories?: string;
  owner?: string;
  rentFeeDay?: number;
  rentFeeWeekend?: number;
  rentFeeWeek?: number;
  discount1Max?: number;
  discount2Owner?: number;
  rentFlag?: number;
  stockSummary?: string;
  warehouseKeys?: string;
  isDiscontinued: boolean;
  isActive: boolean;
  thumbnailUrl?: string;
  thumbnailAlt: string;
  imageCount: number;
  bomRoles: ProductBomRole[];
  createdAt: Date;
};

type ProductLean = {
  imageIds?: unknown[];
  externalImageHints?: string[];
  sku: string;
  internalSku?: string;
  supplierSku?: string;
  supplierNo?: string;
  brand?: string;
  ean?: string;
  names?: { hu?: string; en?: string; de?: string };
  colors?: { hu?: string; en?: string; de?: string };
  descriptions?: { hu?: string; en?: string; de?: string };
  dimensionsMm?: { length?: number; width?: number; height?: number };
  weightKg?: number;
  packageWeightKg?: number;
  packageVolumeM3?: number;
  pricing?: {
    recommendedRetailPriceEur?: number;
    recommendedRetailPriceHuf?: number;
    streetPriceEur?: number;
    streetPriceHuf?: number;
    merchantPriceEur?: number;
    merchantPriceHuf?: number;
  };
  freightLevel?: number;
  stockLevelHint?: number;
  availabilityWeeks?: number;
  youtubeId?: string;
  youtubeVideo?: string;
  inCategories?: string;
  owner?: string;
  rental?: {
    rentFeeDay?: number;
    rentFeeWeekend?: number;
    rentFeeWeek?: number;
    rentFlag?: number;
  };
  discounts?: { discount1Max?: number; discount2Owner?: number };
  isDiscontinued?: boolean;
  isActive?: boolean;
  createdAt: Date;
};

function clip(value?: string, max = 80): string | undefined {
  if (!value) return undefined;
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

const strCol = (
  key: keyof ProductTableRow,
  label: string,
  opts?: Partial<ColumnDef<ProductTableRow>>
): ColumnDef<ProductTableRow> => ({
  key,
  label,
  type: 'string',
  sortable: true,
  filterable: true,
  searchable: true,
  defaultVisible: false,
  ...opts,
});

const numCol = (
  key: keyof ProductTableRow,
  label: string,
  opts?: Partial<ColumnDef<ProductTableRow>>
): ColumnDef<ProductTableRow> => ({
  key,
  label,
  type: 'number',
  sortable: true,
  filterable: true,
  defaultVisible: false,
  ...opts,
});

export function warehouseDisplayLabel(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}

export function formatProductStockSummary(
  entries: Array<{ warehouseName: string; onHand: number }>
): string | undefined {
  const parts = entries
    .filter((e) => e.onHand > 0)
    .map((e) => `${warehouseDisplayLabel(e.warehouseName)}/${e.onHand}`);
  return parts.length ? parts.join(', ') : undefined;
}

export const INVENTORY_PRODUCT_COLUMNS: Array<ColumnDef<ProductTableRow>> = [
  {
    key: 'thumbnailUrl',
    label: '',
    columnPickerLabel: 'Kép előnézet',
    type: 'image',
    sortable: false,
    filterable: false,
    defaultVisible: false,
    headerHint: 'Első elérhető kép (GridFS vagy Excel bild1). Több kép: oszlop „Képek (db)”.',
    imageOptions: { size: 'sm', altKey: 'thumbnailAlt' },
  },
  numCol('imageCount', 'Képek (db)', {
    sortable: false,
    filterable: false,
    headerHint: 'Excel bild1–bild5 és/vagy feltöltött GridFS képek száma.',
  }),
  {
    key: 'bomRole',
    label: 'BOM típus',
    type: 'enum',
    sortable: false,
    filterable: true,
    searchable: false,
    defaultVisible: true,
    headerHint:
      'Összeszerelés = saját alkatrészlista. Kötelező/opcionális alkatrész = más BOM-ban szerepel (Rent=2 → opcionális). Termék = nincs BOM kapcsolat.',
    enumValues: [
      { value: 'assembly', label: 'Összeszerelés' },
      { value: 'component_required', label: 'Kötelező alkatrész' },
      { value: 'component_optional', label: 'Opcionális alkatrész' },
      { value: 'standalone', label: 'Termék' },
    ],
  },
  {
    key: 'sku',
    label: 'CRM SKU',
    type: 'string',
    sortable: true,
    filterable: true,
    searchable: true,
    defaultVisible: true,
    headerHint: 'Kategória előtag + beszállítói cikkszám. Importkor automatikusan generálódik.',
  },
  {
    key: 'supplierSku',
    label: 'Beszállítói SKU',
    type: 'string',
    sortable: true,
    filterable: true,
    searchable: true,
    defaultVisible: true,
  },
  strCol('internalSku', 'Belső SKU'),
  strCol('supplierNo', 'Beszállítói szám'),
  {
    key: 'stockSummary',
    label: 'Raktár / készlet',
    type: 'string',
    sortable: false,
    filterable: false,
    searchable: false,
    defaultVisible: true,
    headerHint: 'Raktár neve / készlet — csak pozitív készlet jelenik meg (pl. Récsei/20)',
  },
  strCol('warehouseKeys', 'Raktár kulcsok', {
    defaultVisible: false,
    headerHint: 'Belső warehouse key lista (StockLevel alapján)',
  }),
  {
    key: 'brand',
    label: 'Márka',
    type: 'string',
    sortable: true,
    filterable: true,
    searchable: true,
    defaultVisible: true,
  },
  strCol('ean', 'EAN'),
  {
    key: 'name_hu',
    label: 'Név (HU)',
    mongoKey: 'names.hu',
    type: 'string',
    sortable: true,
    filterable: true,
    searchable: true,
    defaultVisible: true,
  },
  strCol('name_en', 'Név (EN)', { mongoKey: 'names.en' }),
  strCol('name_de', 'Név (DE)', { mongoKey: 'names.de' }),
  strCol('color_hu', 'Szín (HU)', { mongoKey: 'colors.hu', searchable: false }),
  strCol('color_en', 'Szín (EN)', { mongoKey: 'colors.en', searchable: false }),
  strCol('color_de', 'Szín (DE)', { mongoKey: 'colors.de', searchable: false }),
  strCol('desc_hu', 'Leírás (HU)', {
    mongoKey: 'descriptions.hu',
    searchable: false,
    sortable: false,
  }),
  strCol('desc_en', 'Leírás (EN)', {
    mongoKey: 'descriptions.en',
    searchable: false,
    sortable: false,
  }),
  strCol('desc_de', 'Leírás (DE)', {
    mongoKey: 'descriptions.de',
    searchable: false,
    sortable: false,
  }),
  numCol('length', 'Hossz (mm)', { mongoKey: 'dimensionsMm.length' }),
  numCol('width', 'Szélesség (mm)', { mongoKey: 'dimensionsMm.width' }),
  numCol('height', 'Magasság (mm)', { mongoKey: 'dimensionsMm.height' }),
  numCol('weightKg', 'Súly (kg)'),
  numCol('packageWeightKg', 'Csomag súly (kg)'),
  numCol('packageVolumeM3', 'Csomag térfogat (m³)'),
  numCol('priceRetailEur', 'Ajánlott ár (EUR)', {
    mongoKey: 'pricing.recommendedRetailPriceEur',
  }),
  numCol('priceRetailHuf', 'Ajánlott ár (HUF)', {
    mongoKey: 'pricing.recommendedRetailPriceHuf',
  }),
  numCol('priceStreetEur', 'Utcaár (EUR)', { mongoKey: 'pricing.streetPriceEur' }),
  numCol('priceStreetHuf', 'Utcaár (HUF)', { mongoKey: 'pricing.streetPriceHuf' }),
  numCol('priceMerchantEur', 'Kereskedői ár (EUR)', {
    mongoKey: 'pricing.merchantPriceEur',
  }),
  numCol('priceMerchantHuf', 'Kereskedői ár (HUF)', {
    mongoKey: 'pricing.merchantPriceHuf',
  }),
  numCol('freightLevel', 'Freight level'),
  numCol('stockLevelHint', 'Készlet szint'),
  numCol('availabilityWeeks', 'Elérhetőség (hét)'),
  strCol('youtubeId', 'YouTube ID', { searchable: false }),
  strCol('youtubeVideo', 'YouTube videó', { searchable: false, sortable: false }),
  strCol('inCategories', 'Kategória lista (import)', { sortable: false }),
  strCol('owner', 'Owner'),
  numCol('rentFeeDay', 'Bérleti díj / nap', { mongoKey: 'rental.rentFeeDay' }),
  numCol('rentFeeWeekend', 'Bérleti díj / hétvége', { mongoKey: 'rental.rentFeeWeekend' }),
  numCol('rentFeeWeek', 'Bérleti díj / hét', { mongoKey: 'rental.rentFeeWeek' }),
  numCol('discount1Max', 'Kedvezmény 1', { mongoKey: 'discounts.discount1Max' }),
  numCol('discount2Owner', 'Kedvezmény 2', { mongoKey: 'discounts.discount2Owner' }),
  numCol('rentFlag', 'Rent flag', { mongoKey: 'rental.rentFlag' }),
  {
    key: 'isDiscontinued',
    label: 'Kifutó',
    type: 'boolean',
    sortable: true,
    filterable: true,
    defaultVisible: false,
  },
  {
    key: 'isActive',
    label: 'Aktív',
    type: 'boolean',
    sortable: true,
    filterable: true,
    defaultVisible: true,
  },
  {
    key: 'createdAt',
    label: 'Létrehozva',
    type: 'date',
    sortable: true,
    filterable: false,
    defaultVisible: false,
  },
];

export const INVENTORY_PRODUCT_SELECT = {
  sku: 1,
  internalSku: 1,
  supplierSku: 1,
  supplierNo: 1,
  brand: 1,
  ean: 1,
  names: 1,
  colors: 1,
  descriptions: 1,
  dimensionsMm: 1,
  weightKg: 1,
  packageWeightKg: 1,
  packageVolumeM3: 1,
  pricing: 1,
  freightLevel: 1,
  stockLevelHint: 1,
  availabilityWeeks: 1,
  youtubeId: 1,
  youtubeVideo: 1,
  inCategories: 1,
  owner: 1,
  rental: 1,
  discounts: 1,
  imageIds: 1,
  externalImageHints: 1,
  isDiscontinued: 1,
  isActive: 1,
  components: 1,
  createdAt: 1,
} as const;

export function mapProductToTableRow(
  p: ProductLean & { components?: unknown[] },
  thumbnailUrl?: string,
  warehouseKeys?: string[],
  stockSummary?: string,
  bomRoles: ProductBomRole[] = ['standalone']
): ProductTableRow {
  return {
    sku: p.sku,
    stockSummary,
    warehouseKeys: warehouseKeys?.length ? warehouseKeys.join(', ') : undefined,
    internalSku: p.internalSku,
    supplierSku: p.supplierSku,
    supplierNo: p.supplierNo,
    brand: p.brand,
    ean: p.ean,
    name_hu: p.names?.hu,
    name_en: p.names?.en,
    name_de: p.names?.de,
    color_hu: p.colors?.hu,
    color_en: p.colors?.en,
    color_de: p.colors?.de,
    desc_hu: clip(p.descriptions?.hu),
    desc_en: clip(p.descriptions?.en),
    desc_de: clip(p.descriptions?.de),
    length: p.dimensionsMm?.length,
    width: p.dimensionsMm?.width,
    height: p.dimensionsMm?.height,
    weightKg: p.weightKg,
    packageWeightKg: p.packageWeightKg,
    packageVolumeM3: p.packageVolumeM3,
    priceRetailEur: p.pricing?.recommendedRetailPriceEur,
    priceRetailHuf: p.pricing?.recommendedRetailPriceHuf,
    priceStreetEur: p.pricing?.streetPriceEur,
    priceStreetHuf: p.pricing?.streetPriceHuf,
    priceMerchantEur: p.pricing?.merchantPriceEur,
    priceMerchantHuf: p.pricing?.merchantPriceHuf,
    freightLevel: p.freightLevel,
    stockLevelHint: p.stockLevelHint,
    availabilityWeeks: p.availabilityWeeks,
    youtubeId: p.youtubeId,
    youtubeVideo: p.youtubeVideo,
    inCategories: p.inCategories,
    owner: p.owner,
    rentFeeDay: p.rental?.rentFeeDay,
    rentFeeWeekend: p.rental?.rentFeeWeekend,
    rentFeeWeek: p.rental?.rentFeeWeek,
    discount1Max: p.discounts?.discount1Max,
    discount2Owner: p.discounts?.discount2Owner,
    rentFlag: p.rental?.rentFlag,
    isDiscontinued: Boolean(p.isDiscontinued),
    isActive: Boolean(p.isActive),
    thumbnailUrl,
    thumbnailAlt: p.names?.hu ?? p.sku,
    imageCount: countProductImages(p),
    bomRoles,
    createdAt: p.createdAt,
  };
}
