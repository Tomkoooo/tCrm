import { z } from 'zod';
import { parseHrDateOnly, parseHrDateTime, formatHrDateKey } from '../hr-schedule-datetime';

const hrDateOnlyField = z
  .union([z.string(), z.date()])
  .transform((v) =>
    v instanceof Date ? parseHrDateOnly(formatHrDateKey(v)) : parseHrDateOnly(String(v).trim())
  );

const hrDateTimeField = z.union([z.string(), z.date()]).transform((v) => {
  if (v instanceof Date) return v;
  return parseHrDateTime(String(v).trim());
});

export const companyDataEntrySchema = z.object({
  key: z.string().min(1, 'A kulcs kötelező').max(100),
  value: z.string().max(2000),
});

export const companySchema = z.object({
  name: z.string().min(1, 'A név kötelező'),
  slug: z
    .string()
    .min(1, 'A slug kötelező')
    .regex(/^[a-z0-9-]+$/, 'Csak kisbetű, szám és kötőjel'),
  parentCompanyId: z.string().optional().or(z.literal('')),
  isActive: z.boolean().default(true),
  companyDataJson: z.string().optional().or(z.literal('')),
});

export function parseCompanyDataJson(json: string | undefined | null): Record<string, string> {
  if (!json?.trim()) return {};
  const parsed = z.array(companyDataEntrySchema).parse(JSON.parse(json));
  const result: Record<string, string> = {};
  for (const entry of parsed) {
    const key = entry.key.trim();
    if (!key) continue;
    result[key] = entry.value;
  }
  return result;
}

export function companyDataToEntries(
  data: Record<string, string> | Map<string, string> | undefined
): Array<{ key: string; value: string }> {
  if (!data) return [];
  const entries = data instanceof Map ? [...data.entries()] : Object.entries(data);
  return entries.map(([key, value]) => ({ key, value: String(value ?? '') }));
}

export const employeeSchema = z.object({
  companyId: z.string().min(1, 'A cég kötelező'),
  name: z.string().min(1, 'A név kötelező'),
  email: z.string().email('Érvénytelen e-mail').optional().or(z.literal('')),
  employeeNumber: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  employmentType: z.enum(['employee', 'guest']).default('guest'),
  workerCategory: z.enum(['regular', 'occasional']).default('regular'),
  workScheduleType: z.enum(['full_time', 'part_time']).default('full_time'),
  contractedWeeklyHours: z.coerce.number().min(0).optional().or(z.literal('')),
  contractedDailyHours: z.coerce.number().min(0).optional().or(z.literal('')),
  payType: z.enum(['monthly', 'hourly']).optional().or(z.literal('')),
  monthlySalaryHuf: z.coerce.number().min(0).optional().or(z.literal('')),
  hourlyRateHuf: z.coerce.number().min(0).optional().or(z.literal('')),
  calendarColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .or(z.literal('')),
  birthName: z.string().optional(),
  birthPlaceDate: z.string().optional(),
  mothersName: z.string().optional(),
  address: z.string().optional(),
  taj: z.string().optional(),
  taxId: z.string().optional(),
  isActive: z.boolean().default(true),
  hrNotes: z.string().optional(),
  supervisorEmployeeId: z.string().optional().or(z.literal('')),
});

/** Shared profile across all company records for one person. */
export const employeePersonSchema = employeeSchema.pick({
  name: true,
  email: true,
  phone: true,
  workerCategory: true,
  workScheduleType: true,
  contractedWeeklyHours: true,
  contractedDailyHours: true,
  calendarColor: true,
  birthName: true,
  birthPlaceDate: true,
  mothersName: true,
  address: true,
  taj: true,
  taxId: true,
  hrNotes: true,
});

/** Per-company fields on a single employee record. */
export const employeeMembershipSchema = employeeSchema.pick({
  department: true,
  employeeNumber: true,
  payType: true,
  monthlySalaryHuf: true,
  hourlyRateHuf: true,
  isActive: true,
  employmentType: true,
});

/** Optional employee block on user create / register (company required when enabled). */
export const userEmployeeProfileSchema = z.object({
  linkEmployee: z.coerce.boolean().optional(),
  companyId: z.string().optional(),
  employeeNumber: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  hrNotes: z.string().optional(),
});

export function parseLinkEmployeeFromForm(formData: FormData): boolean {
  return (
    formData.get('linkEmployee') === 'on' ||
    formData.get('linkEmployee') === 'true' ||
    formData.get('registerAsEmployee') === 'on' ||
    formData.get('registerAsEmployee') === 'true'
  );
}

export function employeeProfileFromForm(
  formData: FormData,
  linkEmployee: boolean
): {
  companyId?: string;
  employeeNumber?: string;
  department?: string;
  phone?: string;
  hrNotes?: string;
} | null {
  const companyId = String(formData.get('companyId') ?? '').trim();
  if (!companyId) return null;
  if (!linkEmployee) return null;
  return {
    companyId,
    employeeNumber: String(formData.get('employeeNumber') ?? '').trim() || undefined,
    department: String(formData.get('department') ?? '').trim() || undefined,
    phone: String(formData.get('phone') ?? '').trim() || undefined,
    hrNotes: String(formData.get('hrNotes') ?? '').trim() || undefined,
  };
}

export const addEmployeeToCompanySchema = z.object({
  sourceEmployeeId: z.string().min(1),
  targetCompanyId: z.string().min(1),
});

export const linkExistingUserSchema = z.object({
  employeeId: z.string().min(1),
  userId: z.string().min(1),
});

export const searchUsersSchema = z.object({
  q: z.string().min(2),
});

export const inviteEmployeeSchema = z
  .object({
    employeeId: z.string().min(1),
    password: z.string().min(8, 'A jelszó legalább 8 karakter').optional(),
    mode: z.enum(['password', 'link_existing', 'email_invite']).default('password'),
    linkUserId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'password' && !data.password) {
      ctx.addIssue({ code: 'custom', message: 'A jelszó kötelező', path: ['password'] });
    }
    if (data.mode === 'link_existing' && !data.linkUserId) {
      ctx.addIssue({ code: 'custom', message: 'Válasszon felhasználót', path: ['linkUserId'] });
    }
  });

export const teamSchema = z.object({
  companyId: z.string().min(1, 'A cég kötelező'),
  name: z.string().min(1, 'A név kötelező'),
  slug: z
    .string()
    .min(1, 'A slug kötelező')
    .regex(/^[a-z0-9-]+$/, 'Csak kisbetű, szám és kötőjel'),
  leaderEmployeeId: z.string().min(1, 'Válasszon csapatvezetőt'),
  memberEmployeeIds: z.array(z.string().min(1)).default([]),
  teamType: z.enum(['builders', 'drivers', 'mixed', 'other']).optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

export const scheduleEntryKindSchema = z.enum(['shift', 'off', 'training', 'other', 'field_work']);

export const scheduleEntrySchema = z
  .object({
    employeeId: z.string().min(1),
    start: hrDateTimeField,
    end: hrDateTimeField,
    allDay: z.boolean().optional(),
    kind: scheduleEntryKindSchema.default('shift'),
    title: z.string().optional(),
    notes: z.string().optional(),
    locationLabel: z.string().max(200).optional(),
    locationAddress: z.string().max(500).optional(),
  })
  .refine((d) => d.end > d.start, { message: 'A befejezés későbbi kell legyen', path: ['end'] });

export const scheduleEntryUpdateSchema = z
  .object({
    id: z.string().min(1),
    start: hrDateTimeField,
    end: hrDateTimeField,
    allDay: z.boolean().optional(),
    kind: scheduleEntryKindSchema.default('shift'),
    title: z.string().optional(),
    notes: z.string().optional(),
    locationLabel: z.string().max(200).optional(),
    locationAddress: z.string().max(500).optional(),
  })
  .refine((d) => d.end > d.start, { message: 'A befejezés későbbi kell legyen', path: ['end'] });

export const hrRequestHolidaySchema = z
  .object({
    type: z.literal('holiday'),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    reason: z.string().optional(),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: 'A befejezés nem lehet korábbi',
    path: ['endDate'],
  });

export const hrRequestSickSchema = z
  .object({
    type: z.literal('sick_leave'),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    reason: z.string().optional(),
    sickPayAmount: z.coerce.number().min(0).optional(),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: 'A befejezés nem lehet korábbi',
    path: ['endDate'],
  });

export const hrRequestScheduleChangeSchema = z
  .object({
    type: z.literal('schedule_change'),
    scheduleEntryId: z.string().min(1, 'Válasszon módosítandó műszakot'),
    proposedStart: hrDateTimeField,
    proposedEnd: hrDateTimeField,
    reason: z.string().optional(),
  })
  .refine((d) => d.proposedEnd >= d.proposedStart, {
    message: 'A javasolt befejezés nem lehet korábbi',
    path: ['proposedEnd'],
  });

export const hrRequestSchema = z.discriminatedUnion('type', [
  hrRequestHolidaySchema,
  hrRequestSickSchema,
  hrRequestScheduleChangeSchema,
]);

export const monthlyWorkSummarySchema = z.object({
  employeeId: z.string().min(1),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  workedHours: z.coerce.number().min(0),
  holidayDays: z.coerce.number().min(0),
  sickDays: z.coerce.number().min(0),
  sickPayAmount: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

export const employeeLeaveYearSchema = z.object({
  employeeId: z.string().min(1),
  year: z.coerce.number().int().min(2000).max(2100),
  entitlementDays: z.coerce.number().min(0),
  notes: z.string().optional(),
});

export const employeePersonalDataSchema = z.object({
  birthName: z.string().optional(),
  birthPlaceDate: z.string().optional(),
  mothersName: z.string().optional(),
  address: z.string().optional(),
  taj: z.string().optional(),
  taxId: z.string().optional(),
});

export const bulkScheduleSchema = z.object({
  employeeIds: z.array(z.string().min(1)).min(1),
  startDate: hrDateOnlyField,
  endDate: hrDateOnlyField,
  shiftStartTime: z.string().regex(/^\d{2}:\d{2}$/),
  shiftEndTime: z.string().regex(/^\d{2}:\d{2}$/),
  mode: z.enum([
    'workdays',
    'selected_dates',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ]),
  selectedDates: z.array(hrDateOnlyField).optional(),
  skipExisting: z.coerce.boolean().default(true),
});

export type CompanyInput = z.infer<typeof companySchema>;
export type EmployeeInput = z.infer<typeof employeeSchema>;
export type TeamInput = z.infer<typeof teamSchema>;
export type ScheduleEntryInput = z.infer<typeof scheduleEntrySchema>;
export type HrRequestInput = z.infer<typeof hrRequestSchema>;
export type MonthlyWorkSummaryInput = z.infer<typeof monthlyWorkSummarySchema>;
