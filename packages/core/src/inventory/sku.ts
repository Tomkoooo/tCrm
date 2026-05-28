export type CategorySkuSettings = {
  prefix: string;
  totalLength: number;
  padChar?: string;
};

export function normalizeDigits(value: string): string {
  return value.replace(/\D+/g, '');
}

/** Belső kód: kategória előtag + a CRM SKU számjegyei */
export function generateInternalSku(settings: CategorySkuSettings, crmSku: string): string {
  const prefix = String(settings.prefix ?? '').trim();
  const totalLength = Number(settings.totalLength);
  const padChar = (settings.padChar ?? '0').slice(0, 1);

  if (!prefix) throw new Error('Missing category SKU prefix');
  if (!Number.isFinite(totalLength) || totalLength < prefix.length + 1) {
    throw new Error('Invalid category SKU total length');
  }

  const skuPartLength = totalLength - prefix.length;
  const digits = normalizeDigits(String(crmSku ?? ''));
  const trimmed = digits.slice(-skuPartLength);
  const padded = trimmed.padStart(skuPartLength, padChar);
  return `${prefix}${padded}`;
}
