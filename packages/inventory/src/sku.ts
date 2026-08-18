export type CategorySkuSettings = {
  prefix: string;
  totalLength: number;
  padChar?: string;
};

/** Fallback when a category has no SKU prefix — sequential `Q` + digits. */
export const QUICK_SKU_FALLBACK: CategorySkuSettings = {
  prefix: 'Q',
  totalLength: 8,
};

export type CategorySkuSource = {
  skuPrefix?: string | null;
  skuTotalLength?: number | null;
  skuPadChar?: string | null;
};

export function skuSettingsFromCategory(category?: CategorySkuSource | null): CategorySkuSettings {
  const prefix = String(category?.skuPrefix ?? '').trim();
  if (!prefix) return { ...QUICK_SKU_FALLBACK };

  const requestedLength = Number(category?.skuTotalLength);
  const minLength = prefix.length + 1;
  const totalLength =
    Number.isFinite(requestedLength) && requestedLength >= minLength
      ? requestedLength
      : prefix.length + 6;

  return {
    prefix,
    totalLength,
    padChar: category?.skuPadChar ?? undefined,
  };
}

/** Sequential CRM SKU from a category prefix (or `Q` fallback) + integer sequence. */
export function formatSequentialSku(settings: CategorySkuSettings, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error('A SKU sorszámnak pozitív egésznek kell lennie.');
  }
  const skuPartLength = settings.totalLength - String(settings.prefix ?? '').trim().length;
  if (!Number.isFinite(skuPartLength) || skuPartLength < 1) {
    throw new Error('Invalid category SKU total length');
  }
  if (String(sequence).length > skuPartLength) {
    throw new Error('A kategória SKU számtartománya betelt.');
  }
  return generateInternalSku(settings, String(sequence));
}

export function normalizeDigits(value: string): string {
  return value.replace(/\D+/g, '');
}

/** Belső kód: kategória előtag + a beszállítói SKU (nullákkal balra kitöltve) */
export function generateInternalSku(settings: CategorySkuSettings, supplierSku: string): string {
  const prefix = String(settings.prefix ?? '').trim();
  const totalLength = Number(settings.totalLength);
  const padChar = (settings.padChar ?? '0').slice(0, 1);

  if (!prefix) throw new Error('Missing category SKU prefix');
  if (!Number.isFinite(totalLength) || totalLength < prefix.length + 1) {
    throw new Error('Invalid category SKU total length');
  }

  const skuPartLength = totalLength - prefix.length;
  const digits = normalizeDigits(String(supplierSku ?? ''));
  const trimmed = digits.slice(-skuPartLength);
  const padded = trimmed.padStart(skuPartLength, padChar);
  return `${prefix}${padded}`;
}

export type SupplierSkuCutOptions = {
  /** Beszállítói SKU hossza — ennyi számjegy az SM SKU végéről (kötelező SM importnál) */
  supplierSkuLength?: number;
  /** @deprecated use supplierSkuLength */
  digitCount?: number;
  /** @deprecated ignored — supplier SKU is always read from the end of the SM SKU */
  stripCategoryPrefix?: boolean;
};

function resolveSupplierSkuLength(options?: SupplierSkuCutOptions): number | undefined {
  const length = options?.supplierSkuLength ?? options?.digitCount;
  if (length === undefined || length === null) return undefined;
  const n = Number(length);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Reverse of generateInternalSku when supplier SKU length is known:
 * prefix + padStart(supplierSku) → take last N digits of the SM SKU.
 */
export function deriveSupplierSkuFromSm(
  settings: CategorySkuSettings,
  smSku: string,
  options?: SupplierSkuCutOptions
): string {
  const supplierSkuLength = resolveSupplierSkuLength(options);
  if (!supplierSkuLength) {
    throw new Error(
      'Adja meg a beszállítói SKU hosszát (hány számjegyet vágjon le az SM SKU végéről).'
    );
  }

  const digits = normalizeDigits(String(smSku ?? ''));
  if (digits.length < supplierSkuLength) {
    throw new Error(
      `Az SM SKU túl rövid (${digits.length} számjegy); legalább ${supplierSkuLength} kell.`
    );
  }

  const prefixDigits = normalizeDigits(String(settings.prefix ?? ''));
  if (prefixDigits && !digits.startsWith(prefixDigits)) {
    throw new Error(
      `CRM SKU „${smSku}” nem illeszkedik a kategória előtaghoz (${settings.prefix}).`
    );
  }

  return digits.slice(-supplierSkuLength);
}

/** Reverse of generateInternalSku — requires supplierSkuLength for unambiguous decode. */
export function deriveSupplierSkuFromCrmSku(
  settings: CategorySkuSettings,
  crmSku: string,
  options?: SupplierSkuCutOptions
): string {
  const supplierSkuLength = resolveSupplierSkuLength(options);
  if (supplierSkuLength) {
    return deriveSupplierSkuFromSm(settings, crmSku, { supplierSkuLength });
  }

  const prefix = String(settings.prefix ?? '').trim();
  const totalLength = Number(settings.totalLength);
  const prefixDigits = normalizeDigits(prefix);
  const digits = normalizeDigits(String(crmSku ?? ''));

  if (!prefixDigits) throw new Error('Missing category SKU prefix');
  if (!Number.isFinite(totalLength) || totalLength < prefixDigits.length + 1) {
    throw new Error('Invalid category SKU total length');
  }
  if (!digits.startsWith(prefixDigits)) {
    throw new Error(`CRM SKU „${crmSku}” nem illeszkedik a kategória előtaghoz (${prefix}).`);
  }

  const skuPartLength = totalLength - prefixDigits.length;
  const suffix = digits.slice(prefixDigits.length, prefixDigits.length + skuPartLength);
  if (suffix.length < skuPartLength) {
    throw new Error(`CRM SKU „${crmSku}” rövidebb a kategória teljes hosszánál (${totalLength}).`);
  }

  return suffix;
}
