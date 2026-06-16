import type { EmployeeInput } from '@crm/lib/validation';

export function parseEmployeePersonFormData(
  formData: FormData
): Omit<
  EmployeeInput,
  | 'companyId'
  | 'employeeNumber'
  | 'department'
  | 'payType'
  | 'monthlySalaryHuf'
  | 'hourlyRateHuf'
  | 'isActive'
  | 'employmentType'
> {
  const weekly = formData.get('contractedWeeklyHours');
  const daily = formData.get('contractedDailyHours');
  return {
    name: String(formData.get('name') ?? ''),
    email: String(formData.get('email') ?? '') || undefined,
    phone: String(formData.get('phone') ?? '') || undefined,
    workerCategory: (formData.get('workerCategory') as 'regular' | 'occasional') || 'regular',
    workScheduleType:
      (formData.get('workScheduleType') as 'full_time' | 'part_time') || 'full_time',
    contractedWeeklyHours: weekly ? Number(weekly) : undefined,
    contractedDailyHours: daily ? Number(daily) : undefined,
    calendarColor: String(formData.get('calendarColor') ?? '').trim() || undefined,
    birthName: String(formData.get('birthName') ?? '') || undefined,
    birthPlaceDate: String(formData.get('birthPlaceDate') ?? '') || undefined,
    mothersName: String(formData.get('mothersName') ?? '') || undefined,
    address: String(formData.get('address') ?? '') || undefined,
    taj: String(formData.get('taj') ?? '') || undefined,
    taxId: String(formData.get('taxId') ?? '') || undefined,
    hrNotes: String(formData.get('hrNotes') ?? '') || undefined,
  };
}

export function personPayloadFromInput(parsed: ReturnType<typeof parseEmployeePersonFormData>) {
  const weekly =
    parsed.contractedWeeklyHours === '' || parsed.contractedWeeklyHours == null
      ? undefined
      : Number(parsed.contractedWeeklyHours);
  const daily =
    parsed.contractedDailyHours === '' || parsed.contractedDailyHours == null
      ? undefined
      : Number(parsed.contractedDailyHours);

  return {
    name: parsed.name,
    email: parsed.email || undefined,
    phone: parsed.phone,
    workerCategory: parsed.workerCategory,
    workScheduleType: parsed.workScheduleType,
    contractedWeeklyHours: weekly,
    contractedDailyHours: daily,
    calendarColor: parsed.calendarColor || undefined,
    personalData: {
      birthName: parsed.birthName,
      birthPlaceDate: parsed.birthPlaceDate,
      mothersName: parsed.mothersName,
      address: parsed.address,
      taj: parsed.taj,
      taxId: parsed.taxId,
    },
    hrNotes: parsed.hrNotes,
  };
}

export function parseEmployeeMembershipFormData(formData: FormData) {
  return {
    department: String(formData.get('department') ?? '') || undefined,
    employeeNumber: String(formData.get('employeeNumber') ?? '') || undefined,
    payType: (formData.get('payType') as 'monthly' | 'hourly' | '') || undefined,
    monthlySalaryHuf: formData.get('monthlySalaryHuf')
      ? Number(formData.get('monthlySalaryHuf'))
      : undefined,
    hourlyRateHuf: formData.get('hourlyRateHuf')
      ? Number(formData.get('hourlyRateHuf'))
      : undefined,
    isActive: formData.get('isActive') === 'on' || formData.get('isActive') === 'true',
    employmentType: (formData.get('employmentType') as 'employee' | 'guest') || 'guest',
  };
}

export function membershipPayloadFromInput(
  parsed: ReturnType<typeof parseEmployeeMembershipFormData>
) {
  const payType = parsed.payType || undefined;
  const monthlySalary =
    parsed.monthlySalaryHuf == null ? undefined : Number(parsed.monthlySalaryHuf);
  const hourlyRate = parsed.hourlyRateHuf == null ? undefined : Number(parsed.hourlyRateHuf);

  return {
    department: parsed.department,
    employeeNumber: parsed.employeeNumber,
    payType: payType as 'monthly' | 'hourly' | undefined,
    monthlySalaryHuf: monthlySalary,
    hourlyRateHuf: hourlyRate,
    isActive: parsed.isActive,
    employmentType: parsed.employmentType,
  };
}
