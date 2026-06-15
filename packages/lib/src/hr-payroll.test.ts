import { describe, expect, it } from 'vitest';
import { calculateEmployeeGrossPay, payTypeLabel } from './hr-payroll';

describe('calculateEmployeeGrossPay', () => {
  it('computes hourly pay from worked hours plus sick pay', () => {
    expect(
      calculateEmployeeGrossPay({
        payType: 'hourly',
        hourlyRateHuf: 3000,
        workedHours: 40,
        sickPayAmount: 5000,
      })
    ).toBe(125000);
  });

  it('computes monthly pay plus sick pay', () => {
    expect(
      calculateEmployeeGrossPay({
        payType: 'monthly',
        monthlySalaryHuf: 450000,
        workedHours: 160,
        sickPayAmount: 10000,
      })
    ).toBe(460000);
  });

  it('returns null when no pay configured', () => {
    expect(
      calculateEmployeeGrossPay({
        payType: undefined,
        workedHours: 40,
      })
    ).toBeNull();
  });
});

describe('payTypeLabel', () => {
  it('labels pay types in Hungarian', () => {
    expect(payTypeLabel('monthly')).toBe('Havi');
    expect(payTypeLabel('hourly')).toBe('Órabér');
    expect(payTypeLabel(null)).toBe('—');
  });
});
