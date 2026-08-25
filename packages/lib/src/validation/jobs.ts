import { z } from 'zod';

const objectIdSchema = z.string().min(1, 'ID kötelező');
const positiveQty = z.coerce.number().min(0.000001, 'Mennyiség > 0');

export const demandKitComponentSchema = z.object({
  productId: objectIdSchema,
  quantity: positiveQty,
  note: z.string().max(500).optional(),
});

export const demandKitSchema = z.object({
  name: z.string().max(300).optional(),
  substitutionNote: z.string().max(2000).optional(),
  components: z.array(demandKitComponentSchema).min(1, 'Legalább egy alkatrész kell'),
});

export const demandLineInputSchema = z
  .object({
    productId: objectIdSchema.optional(),
    requestedQuantity: positiveQty,
    isOptional: z.boolean().optional(),
    note: z.string().max(500).optional(),
    kit: demandKitSchema.optional(),
    warehouseId: objectIdSchema.optional(),
  })
  .superRefine((line, ctx) => {
    if (!line.productId && !line.kit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Termék vagy egyedi összeállítás kell.',
      });
    }
  });

export function parseDemandJson(json: string): z.infer<typeof demandLineInputSchema>[] {
  return z.array(demandLineInputSchema).min(1).parse(JSON.parse(json));
}

export const createJobSchema = z.object({
  eventName: z.string().min(1).max(300),
  siteAddress: z.string().min(1).max(500),
  note: z.string().max(2000).optional(),
  eventAt: z.string().optional(),
  pickupAt: z.string().optional(),
  returnAt: z.string().optional(),
  demandJson: z.string().min(1, 'Legalább egy tétel szükséges'),
});

export const assignEmployeesSchema = z.object({
  pickupEmployeeId: objectIdSchema,
  dropoffEmployeeId: objectIdSchema.optional().or(z.literal('')),
  crewEmployeeIdsJson: z.string().optional(),
  vehicleId: objectIdSchema.optional().or(z.literal('')),
});

export function parseCrewEmployeeIdsJson(json?: string): string[] {
  if (!json?.trim()) return [];
  return z.array(objectIdSchema).parse(JSON.parse(json));
}

export const pickupCheckInLineSchema = z.object({
  productId: objectIdSchema,
  gatheredQuantity: z.coerce.number().min(0),
  warehouseId: objectIdSchema.optional(),
});

export const returnCheckInLineSchema = z.object({
  productId: objectIdSchema,
  checkedQuantity: z.coerce.number().min(0),
  returnWarehouseId: objectIdSchema.optional(),
});

export const pickupCheckInSchema = z.object({
  linesJson: z.string().min(1),
  note: z.string().max(2000).optional(),
});

export const returnCheckInSchema = z.object({
  linesJson: z.string().min(1),
  note: z.string().max(2000).optional(),
});

export function parsePickupCheckInLinesJson(
  json: string
): z.infer<typeof pickupCheckInLineSchema>[] {
  return z.array(pickupCheckInLineSchema).parse(JSON.parse(json));
}

export function parseReturnCheckInLinesJson(
  json: string
): z.infer<typeof returnCheckInLineSchema>[] {
  return z.array(returnCheckInLineSchema).parse(JSON.parse(json));
}

export const jobFeedbackSchema = z.object({
  message: z.string().min(1).max(4000),
});

export const vehicleSchema = z.object({
  name: z.string().min(1).max(200),
  plateNumber: z.string().min(1).max(32),
  lengthMm: z.coerce.number().min(1),
  widthMm: z.coerce.number().min(1),
  heightMm: z.coerce.number().min(1),
  maxWeightKg: z.coerce.number().min(0.001),
  maxVolumeM3: z.coerce.number().min(0.000001),
  isActive: z.coerce.boolean().optional().default(true),
  companyId: z.string().optional().or(z.literal('')),
  registrationDueDate: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((v) => (v?.trim() ? new Date(v) : undefined)),
  insuranceDueDate: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((v) => (v?.trim() ? new Date(v) : undefined)),
  licenseFileId: z.string().optional().or(z.literal('')),
  registrationFileId: z.string().optional().or(z.literal('')),
  insuranceFileId: z.string().optional().or(z.literal('')),
});

export const vehicleIncidentSchema = z.object({
  description: z.string().min(1, 'A leírás kötelező').max(5000),
});

export function parseMediaIdsFromForm(formData: FormData, fieldName = 'imageId'): string[] {
  return formData
    .getAll(fieldName)
    .map((v) => String(v).trim())
    .filter(Boolean);
}

export function parseCheckboxIdsFromForm(formData: FormData, fieldName: string): string[] {
  return formData
    .getAll(fieldName)
    .map((v) => String(v).trim())
    .filter(Boolean);
}

export type VehicleInput = z.infer<typeof vehicleSchema>;
export type VehicleIncidentInput = z.infer<typeof vehicleIncidentSchema>;
