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

export const companySchema = z.object({
  name: z.string().min(1, 'A név kötelező').max(200),
  slug: emptyToUndefined(z.string().min(1).max(120)),
  isActive: z
    .union([z.literal('true'), z.literal('false'), z.literal('on'), z.literal('')])
    .optional()
    .transform((v) => v === undefined || v === 'true' || v === 'on'),
  notes: emptyToUndefined(z.string().max(2000)),
});

export const employeeSchema = z.object({
  name: z.string().min(1, 'A név kötelező').max(200),
  companyId: z.string().min(1, 'A cég kötelező'),
  email: emptyToUndefined(z.string().email('Érvénytelen e-mail').max(320)),
  phone: emptyToUndefined(z.string().max(64)),
  userId: emptyToUndefined(z.string().min(1)),
  scheduleMode: z.enum(['logistics', 'roster']).optional().default('logistics'),
  calendarColor: emptyToUndefined(z.string().max(32)),
  isActive: z
    .union([z.literal('true'), z.literal('false'), z.literal('on'), z.literal('')])
    .optional()
    .transform((v) => v === undefined || v === 'true' || v === 'on'),
  notes: emptyToUndefined(z.string().max(5000)),
});

export const timeOffRequestSchema = z.object({
  employeeId: z.string().min(1).optional(),
  type: z.enum(['leave', 'sick']),
  start: z.string().min(1, 'A kezdő dátum kötelező'),
  end: z.string().min(1, 'A záró dátum kötelező'),
  note: emptyToUndefined(z.string().max(2000)),
});

export const timeOffReviewSchema = z.object({
  id: z.string().min(1),
  decision: z.enum(['approved', 'rejected']),
});

export const rosterShiftSchema = z.object({
  id: emptyToUndefined(z.string().min(1)),
  employeeId: z.string().min(1),
  start: z.string().min(1),
  end: z.string().min(1),
  kind: z.enum(['shift', 'other']).optional().default('shift'),
  title: emptyToUndefined(z.string().max(300)),
  notes: emptyToUndefined(z.string().max(2000)),
});

export const scheduleChangeRequestSchema = z.object({
  scheduleEntryId: z.string().min(1),
  proposedStart: z.string().min(1),
  proposedEnd: z.string().min(1),
  note: emptyToUndefined(z.string().max(2000)),
});

export const scheduleChangeReviewSchema = z.object({
  id: z.string().min(1),
  decision: z.enum(['approved', 'rejected']),
});

export const leaveYearUpsertSchema = z.object({
  employeeId: z.string().min(1),
  year: z.coerce.number().int().min(2000).max(2100),
  entitlementDays: z.coerce.number().min(0),
  notes: emptyToUndefined(z.string().max(2000)),
});

export type CompanyInput = z.infer<typeof companySchema>;
export type EmployeeInput = z.infer<typeof employeeSchema>;
export type TimeOffRequestInput = z.infer<typeof timeOffRequestSchema>;
export type RosterShiftInput = z.infer<typeof rosterShiftSchema>;
