import { Counter, Product } from '@crm/db-core';
import {
  formatSequentialSku,
  skuSettingsFromCategory,
  type CategorySkuSource,
  type CategorySkuSettings,
} from './sku';

function counterKeyForSettings(settings: CategorySkuSettings): string {
  return `product-sku:${settings.prefix}`;
}

/**
 * Allocate the next unused CRM SKU for a category (prefix + sequence).
 * Retries when an imported SKU already occupies that number.
 */
export async function allocateNextProductSku(category?: CategorySkuSource | null): Promise<string> {
  const settings = skuSettingsFromCategory(category);
  const counterKey = counterKeyForSettings(settings);

  for (let attempt = 0; attempt < 40; attempt++) {
    const counter = await Counter.findOneAndUpdate(
      { key: counterKey },
      { $inc: { seq: 1 }, $setOnInsert: { key: counterKey } },
      { returnDocument: 'after', upsert: true }
    ).exec();
    const seq = counter?.seq ?? 1;
    const sku = formatSequentialSku(settings, seq);
    const exists = await Product.exists({ sku }).exec();
    if (!exists) return sku;
  }

  throw new Error('Nem sikerült egyedi SKU-t kiosztani. Próbálja újra.');
}
