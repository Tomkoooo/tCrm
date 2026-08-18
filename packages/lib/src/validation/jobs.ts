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
  employeeIds: z.array(objectIdSchema).default([]),
  /** @deprecated Prefer employeeIds; kept for older clients. */
  teamMemberIds: z.array(objectIdSchema).default([]),
  contactEmails: z.array(emailSchema).default([]),
  note: z.string().max(2000).optional(),
  plannedGatherAt: z.string().optional(),
  plannedEventAt: z.string().optional(),
  lines: z.array(jobLineInputSchema).min(1, 'Legalább egy tétel szükséges'),
});

export const CREW_ROLES = ['director', 'pickup', 'driver', 'builder', 'dropoff'] as const;

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
  })
  .superRefine((line, ctx) => {
    if (!line.productId && !line.kit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Termék vagy egyedi összeállítás kell.',
      });
    }
  });

export const crewMemberInputSchema = z.object({
  employeeId: objectIdSchema,
  roles: z.array(z.enum(CREW_ROLES)).min(1, 'Legalább egy szerep kell'),
});

export const createDemandJobSchema = z.object({
  eventName: z.string().min(1).max(300),
  siteAddress: z.string().min(1).max(500),
  note: z.string().max(2000).optional(),
  plannedEventAt: z.string().optional(),
  plannedGatherAt: z.string().optional(),
  plannedReturnAt: z.string().optional(),
  demandJson: z.string().min(1, 'Legalább egy tétel szükséges'),
  crewJson: z.string().min(1, 'Legalább egy csapattag szükséges'),
  pickupsJson: z.string().optional(),
});

export const itemRequestSchema = z.object({
  note: z.string().min(1).max(2000),
  productId: z.string().optional(),
  quantity: z.coerce.number().min(0).optional(),
});

export const jobFeedbackSchema = z.object({
  feedback: z.string().min(1).max(8000),
});

export const draftPickupRoundSchema = z.object({
  warehouseId: objectIdSchema,
  vehicleId: z.string().optional(),
  vehicleWarning: z.string().max(500).optional(),
  lines: z
    .array(
      z.object({
        productId: objectIdSchema,
        requestedQuantity: positiveQty,
        isOptional: z.boolean().optional(),
      })
    )
    .min(1),
});

export function parseDemandJson(json: string): z.infer<typeof demandLineInputSchema>[] {
  return z.array(demandLineInputSchema).min(1).parse(JSON.parse(json));
}

export function parseDraftPickupRoundsJson(json: string): z.infer<typeof draftPickupRoundSchema>[] {
  return z.array(draftPickupRoundSchema).parse(JSON.parse(json));
}

export function parseCrewJson(json: string): z.infer<typeof crewMemberInputSchema>[] {
  return z.array(crewMemberInputSchema).min(1).parse(JSON.parse(json));
}

export const createJobSchema = z.object({
  eventName: z.string().min(1).max(300),
  siteAddress: z.string().min(1).max(500),
  note: z.string().max(2000).optional(),
  plannedEventAt: z.string().optional(),
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

export const checkInLineSchema = z
  .object({
    productId: objectIdSchema,
    checkedQuantity: z.coerce.number().min(0),
    destinationKind: z.enum(['warehouse', 'job']).optional().default('warehouse'),
    warehouseId: objectIdSchema.optional(),
    jobId: objectIdSchema.optional(),
  })
  .superRefine((line, ctx) => {
    if (line.checkedQuantity <= 0) return;
    if (line.destinationKind === 'job' && !line.jobId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Válaszd ki a következő eseményt.',
        path: ['jobId'],
      });
    }
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
