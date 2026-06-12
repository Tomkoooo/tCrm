export type ProductNamesLike =
  | {
      de?: string | null;
      en?: string | null;
      hu?: string | null;
    }
  | null
  | undefined;

/** Localized product title (HU → EN → DE), then SKU fallback. */
export function productDisplayName(names: ProductNamesLike, fallbackSku?: string): string {
  const name = names?.hu?.trim() || names?.en?.trim() || names?.de?.trim();
  if (name) return name;
  return fallbackSku?.trim() || '—';
}

/** Inline label for logs, sheet descriptions, confirm dialogs. */
export function formatProductSkuLine(name: string | undefined, sku: string): string {
  const displayName = name?.trim() || sku;
  if (displayName === sku) return sku;
  return `${displayName} · ${sku}`;
}

export function productNameFromParts(parts: {
  name_hu?: string;
  name_en?: string;
  name_de?: string;
  sku: string;
}): string {
  return productDisplayName({ hu: parts.name_hu, en: parts.name_en, de: parts.name_de }, parts.sku);
}
