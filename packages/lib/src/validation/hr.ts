import { z } from 'zod';

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
  isActive: z.boolean().default(true),
  hrNotes: z.string().optional(),
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

export const inviteEmployeeSchema = z.object({
  employeeId: z.string().min(1),
  password: z.string().min(8, 'A jelszó legalább 8 karakter'),
});

export const scheduleEntrySchema = z
  .object({
    employeeId: z.string().min(1),
    start: z.coerce.date(),
    end: z.coerce.date(),
    allDay: z.boolean().optional(),
    kind: z.enum(['shift', 'off', 'training', 'other']).default('shift'),
    title: z.string().optional(),
    notes: z.string().optional(),
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

export const hrRequestScheduleChangeSchema = z.object({
  type: z.literal('schedule_change'),
  scheduleEntryId: z.string().optional(),
  proposedStart: z.coerce.date(),
  proposedEnd: z.coerce.date(),
  reason: z.string().optional(),
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

export type CompanyInput = z.infer<typeof companySchema>;
export type EmployeeInput = z.infer<typeof employeeSchema>;
export type ScheduleEntryInput = z.infer<typeof scheduleEntrySchema>;
export type HrRequestInput = z.infer<typeof hrRequestSchema>;
export type MonthlyWorkSummaryInput = z.infer<typeof monthlyWorkSummarySchema>;
