import type { EmployeeInput } from '@crm/lib/validation';

export function parseEmployeeFormData(formData: FormData): EmployeeInput {
  const weekly = formData.get('contractedWeeklyHours');
  const daily = formData.get('contractedDailyHours');
  return {
    companyId: String(formData.get('companyId') ?? ''),
    name: String(formData.get('name') ?? ''),
    email: String(formData.get('email') ?? '') || undefined,
    employeeNumber: String(formData.get('employeeNumber') ?? '') || undefined,
    department: String(formData.get('department') ?? '') || undefined,
    phone: String(formData.get('phone') ?? '') || undefined,
    employmentType: (formData.get('employmentType') as 'employee' | 'guest') || 'guest',
    workerCategory: (formData.get('workerCategory') as 'regular' | 'occasional') || 'regular',
    workScheduleType:
      (formData.get('workScheduleType') as 'full_time' | 'part_time') || 'full_time',
    contractedWeeklyHours: weekly ? Number(weekly) : undefined,
    contractedDailyHours: daily ? Number(daily) : undefined,
    payType: (formData.get('payType') as 'monthly' | 'hourly' | '') || undefined,
    monthlySalaryHuf: formData.get('monthlySalaryHuf')
      ? Number(formData.get('monthlySalaryHuf'))
      : undefined,
    hourlyRateHuf: formData.get('hourlyRateHuf')
      ? Number(formData.get('hourlyRateHuf'))
      : undefined,
    calendarColor: String(formData.get('calendarColor') ?? '').trim() || undefined,
    birthName: String(formData.get('birthName') ?? '') || undefined,
    birthPlaceDate: String(formData.get('birthPlaceDate') ?? '') || undefined,
    mothersName: String(formData.get('mothersName') ?? '') || undefined,
    address: String(formData.get('address') ?? '') || undefined,
    taj: String(formData.get('taj') ?? '') || undefined,
    taxId: String(formData.get('taxId') ?? '') || undefined,
    isActive: formData.get('isActive') === 'on' || formData.get('isActive') === 'true',
    hrNotes: String(formData.get('hrNotes') ?? '') || undefined,
  };
}

export function employeePayloadFromInput(parsed: EmployeeInput) {
  const weekly =
    parsed.contractedWeeklyHours === '' || parsed.contractedWeeklyHours == null
      ? undefined
      : Number(parsed.contractedWeeklyHours);
  const daily =
    parsed.contractedDailyHours === '' || parsed.contractedDailyHours == null
      ? undefined
      : Number(parsed.contractedDailyHours);
  const payType = parsed.payType === '' || parsed.payType == null ? undefined : parsed.payType;
  const monthlySalary =
    parsed.monthlySalaryHuf === '' || parsed.monthlySalaryHuf == null
      ? undefined
      : Number(parsed.monthlySalaryHuf);
  const hourlyRate =
    parsed.hourlyRateHuf === '' || parsed.hourlyRateHuf == null
      ? undefined
      : Number(parsed.hourlyRateHuf);

  return {
    name: parsed.name,
    email: parsed.email || undefined,
    employeeNumber: parsed.employeeNumber,
    department: parsed.department,
    phone: parsed.phone,
    employmentType: parsed.employmentType,
    workerCategory: parsed.workerCategory,
    workScheduleType: parsed.workScheduleType,
    contractedWeeklyHours: weekly,
    contractedDailyHours: daily,
    payType,
    monthlySalaryHuf: monthlySalary,
    hourlyRateHuf: hourlyRate,
    calendarColor: parsed.calendarColor || undefined,
    personalData: {
      birthName: parsed.birthName,
      birthPlaceDate: parsed.birthPlaceDate,
      mothersName: parsed.mothersName,
      address: parsed.address,
      taj: parsed.taj,
      taxId: parsed.taxId,
    },
    isActive: parsed.isActive,
    hrNotes: parsed.hrNotes,
  };
}
