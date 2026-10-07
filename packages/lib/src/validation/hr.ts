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
  reviewNote: emptyToUndefined(z.string().max(2000)),
});

const dayKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Érvénytelen dátum (YYYY-MM-DD)');

const shiftTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Érvénytelen időpont (ÓÓ:PP)');

export const schedulePlanCreateSchema = z
  .object({
    title: z.string().min(1, 'A megnevezés kötelező').max(200),
    companyId: z.string().min(1, 'A cég kötelező'),
    startDateKey: dayKey,
    endDateKey: dayKey,
    employeeIds: z.array(z.string().min(1)).min(1, 'Válassz legalább egy dolgozót'),
    /** Hours, not minutes — 0.25 steps allow a 7.5h day. */
    defaultShiftHours: z.coerce.number().min(0.25).max(24).optional().default(8),
    defaultStartTime: shiftTime.optional().default('08:00'),
    notes: emptyToUndefined(z.string().max(2000)),
  })
  .refine((v) => v.endDateKey >= v.startDateKey, {
    message: 'A záró dátum nem lehet korábbi a kezdő dátumnál',
    path: ['endDateKey'],
  });

export const schedulePlanUpdateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1, 'A megnevezés kötelező').max(200).optional(),
  defaultShiftHours: z.coerce.number().min(0.25).max(24).optional(),
  defaultStartTime: shiftTime.optional(),
  employeeIds: z.array(z.string().min(1)).min(1).optional(),
  notes: emptyToUndefined(z.string().max(2000)),
});

/**
 * One grid cell. `place` is the venue the employee reports to and is what makes a
 * cell exist; blank it to clear the cell. Times fall back to the plan defaults.
 */
export const schedulePlanCellSchema = z.object({
  planId: z.string().min(1),
  employeeId: z.string().min(1),
  dayKey,
  place: z.string().max(120),
  startTime: emptyToUndefined(shiftTime),
  endTime: emptyToUndefined(shiftTime),
  description: emptyToUndefined(z.string().max(2000)),
});

export const schedulePlanDayNoteSchema = z.object({
  planId: z.string().min(1),
  dayKey,
  notes: z.array(z.string().max(300)).max(4),
});

export const schedulePlanPublishSchema = z.object({
  id: z.string().min(1),
  employeeIds: z.array(z.string().min(1)).optional(),
  skipEmptyColumns: z.boolean().optional(),
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
export type SchedulePlanCreateInput = z.infer<typeof schedulePlanCreateSchema>;
export type SchedulePlanUpdateInput = z.infer<typeof schedulePlanUpdateSchema>;
export type SchedulePlanCellInput = z.infer<typeof schedulePlanCellSchema>;
