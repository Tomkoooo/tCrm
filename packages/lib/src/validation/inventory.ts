import { z } from 'zod';

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => {
    if (v === null || v === undefined) return undefined;
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (trimmed === '' || trimmed === '-') return undefined;
      return trimmed;
    }
    return v;
  }, schema.optional());

const numberish = emptyToUndefined(z.coerce.number());

export const skuSchema = z
  .string()
  .min(1, 'SKU is required')
  .max(32, 'SKU must be at most 32 characters')
  .regex(/^[A-Za-z0-9_-]+$/, 'SKU may contain letters, numbers, _ and -');

export const i18nTextSchema = z.object({
  de: emptyToUndefined(z.string().max(500)),
  en: emptyToUndefined(z.string().max(500)),
  hu: emptyToUndefined(z.string().max(500)),
});

export const productComponentSchema = z.object({
  productSku: skuSchema,
  quantity: z.coerce.number().min(0.000001, 'Quantity must be > 0'),
});

export const productSchema = z
  .object({
    sku: skuSchema,
    supplierSku: emptyToUndefined(z.string().max(64)),
    supplierNo: emptyToUndefined(z.string().max(64)),
    brand: emptyToUndefined(z.string().max(100)),
    ean: emptyToUndefined(z.string().max(64)),

    names: i18nTextSchema,
    descriptions: i18nTextSchema.optional(),
    colors: i18nTextSchema.optional(),

    dimensionsMm: z
      .object({
        length: numberish,
        width: numberish,
        height: numberish,
      })
      .optional(),

    weightKg: numberish,
    packageWeightKg: numberish,
    packageVolumeM3: numberish,

    pricing: z
      .object({
        recommendedRetailPriceEur: numberish,
        recommendedRetailPriceHuf: numberish,
        streetPriceEur: numberish,
        streetPriceHuf: numberish,
        merchantPriceEur: numberish,
        merchantPriceHuf: numberish,
      })
      .optional(),

    youtubeId: emptyToUndefined(z.string().max(64)),
    youtubeVideo: emptyToUndefined(z.string().max(500)),

    externalImageHints: z.array(z.string()).optional(),

    freightLevel: numberish,
    stockLevelHint: numberish,
    availabilityWeeks: numberish,

    categoryPath: z
      .object({
        cat1: i18nTextSchema.optional(),
        cat2: i18nTextSchema.optional(),
        cat3: i18nTextSchema.optional(),
      })
      .optional(),

    components: z.array(productComponentSchema).optional(),

    inCategories: emptyToUndefined(z.string().max(5000)),
    isDiscontinued: z.coerce.boolean().optional().default(false),
    isActive: z.coerce.boolean().optional().default(true),

    owner: emptyToUndefined(z.string().max(128)),

    rental: z
      .object({
        rentFeeDay: numberish,
        rentFeeWeekend: numberish,
        rentFeeWeek: numberish,
        rentFlag: emptyToUndefined(
          z.coerce
            .number()
            .int()
            .refine((v) => v === 1 || v === 2)
        ).transform((v) => (v === undefined ? undefined : (v as 1 | 2))),
      })
      .optional(),

    discounts: z
      .object({
        discount1Max: numberish,
        discount2Owner: numberish,
      })
      .optional(),
  })
  .refine((p) => Boolean(p.names.de || p.names.en || p.names.hu), {
    message: 'At least one localized name must be provided (de/en/hu).',
    path: ['names'],
  });

export const warehouseSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[a-z0-9_-]+$/, 'Key must be lowercase (a-z0-9_-).'),
  name: z.string().min(1).max(200),
  address: emptyToUndefined(z.string().max(500)),
  isActive: z.coerce.boolean().optional().default(true),
});

export const categorySchema = z.object({
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  parentId: emptyToUndefined(z.string()),
  slug: z.string().min(1).max(200),
  names: i18nTextSchema,
});

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  delta: z.coerce.number(),
  reason: z.enum(['physical_count', 'damage', 'correction', 'initial_load', 'other']),
  note: emptyToUndefined(z.string().max(2000)),
});

export const inventoryImportRowSchema = z.object({
  // minimally required for commit
  product: productSchema,
  warehouses: z.record(z.string().min(1), z.coerce.number()).default({}),
});

export type ProductInput = z.infer<typeof productSchema>;
export type WarehouseInput = z.infer<typeof warehouseSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
