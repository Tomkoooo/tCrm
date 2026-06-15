export type EmployeePayType = 'monthly' | 'hourly';

export function calculateEmployeeGrossPay(input: {
  payType?: EmployeePayType | null;
  monthlySalaryHuf?: number | null;
  hourlyRateHuf?: number | null;
  workedHours: number;
  sickPayAmount?: number | null;
}): number | null {
  const sickPay = input.sickPayAmount ?? 0;
  if (input.payType === 'hourly' && input.hourlyRateHuf != null && input.hourlyRateHuf > 0) {
    return Math.round(input.workedHours * input.hourlyRateHuf + sickPay);
  }
  if (input.payType === 'monthly' && input.monthlySalaryHuf != null && input.monthlySalaryHuf > 0) {
    return Math.round(input.monthlySalaryHuf + sickPay);
  }
  return sickPay > 0 ? sickPay : null;
}

export function payTypeLabel(payType?: EmployeePayType | null): string {
  if (payType === 'monthly') return 'Havi';
  if (payType === 'hourly') return 'Órabér';
  return '—';
}
