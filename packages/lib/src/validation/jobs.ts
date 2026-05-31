import { z } from 'zod';

const objectIdSchema = z.string().min(1, 'ID kötelező');
const positiveQty = z.coerce.number().min(0.000001, 'Mennyiség > 0');
const emailSchema = z.string().email().max(320);

export const jobLineInputSchema = z.object({
  productId: objectIdSchema,
  requestedQuantity: positiveQty,
});

export const createPickupInputSchema = z.object({
  label: z.string().max(200).optional(),
  warehouseId: objectIdSchema,
  vehicleId: z.string().optional(),
  teamMemberIds: z.array(objectIdSchema).default([]),
  contactEmails: z.array(emailSchema).default([]),
  note: z.string().max(2000).optional(),
  lines: z.array(jobLineInputSchema).min(1, 'Legalább egy tétel szükséges'),
});

export const createJobSchema = z.object({
  eventName: z.string().min(1).max(300),
  siteAddress: z.string().min(1).max(500),
  note: z.string().max(2000).optional(),
  pickupsJson: z.string().min(1, 'Legalább egy átvételi kör szükséges'),
  publish: z
    .union([z.literal('true'), z.literal('false'), z.literal('on'), z.literal('')])
    .optional()
    .transform((v) => v === 'true' || v === 'on'),
});

export const pickupIdParamSchema = z.object({
  pickupId: objectIdSchema,
});

export const gatherJobLinesSchema = z.object({
  pickupId: objectIdSchema,
  linesJson: z.string().min(1),
});

export const installJobLinesSchema = z.object({
  pickupId: objectIdSchema,
  linesJson: z.string().min(1),
});

export const returnJobLinesSchema = z.object({
  pickupId: objectIdSchema,
  linesJson: z.string().min(1),
});

export const checkInJobLinesSchema = z.object({
  pickupId: objectIdSchema,
  linesJson: z.string().min(1),
});

export const gatherLineSchema = z.object({
  productId: objectIdSchema,
  gatheredQuantity: z.coerce.number().min(0),
});

export const installLineSchema = z.object({
  productId: objectIdSchema,
  installedQuantity: z.coerce.number().min(0),
  installedLocation: z.string().max(500).optional(),
});

export const returnLineSchema = z.object({
  productId: objectIdSchema,
  returnedQuantity: z.coerce.number().min(0),
});

export const checkInLineSchema = z.object({
  productId: objectIdSchema,
  checkedQuantity: z.coerce.number().min(0),
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

export const suggestVehiclesSchema = z.object({
  linesJson: z.string().min(1),
});

export function parseJobLinesJson(json: string): z.infer<typeof jobLineInputSchema>[] {
  return z.array(jobLineInputSchema).parse(JSON.parse(json));
}

export function parsePickupsJson(json: string): z.infer<typeof createPickupInputSchema>[] {
  return z.array(createPickupInputSchema).parse(JSON.parse(json));
}

export function parseGatherLinesJson(json: string): z.infer<typeof gatherLineSchema>[] {
  return z.array(gatherLineSchema).parse(JSON.parse(json));
}

export function parseInstallLinesJson(json: string): z.infer<typeof installLineSchema>[] {
  return z.array(installLineSchema).parse(JSON.parse(json));
}

export function parseReturnLinesJson(json: string): z.infer<typeof returnLineSchema>[] {
  return z.array(returnLineSchema).parse(JSON.parse(json));
}

export function parseCheckInLinesJson(json: string): z.infer<typeof checkInLineSchema>[] {
  return z.array(checkInLineSchema).parse(JSON.parse(json));
}

export type VehicleInput = z.infer<typeof vehicleSchema>;
export type VehicleIncidentInput = z.infer<typeof vehicleIncidentSchema>;
export type CreatePickupInput = z.infer<typeof createPickupInputSchema>;
