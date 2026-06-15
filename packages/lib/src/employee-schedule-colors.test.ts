import { describe, expect, it } from 'vitest';
import {
  defaultEmployeeScheduleColor,
  EMPLOYEE_SCHEDULE_COLORS,
  resolveEmployeeScheduleColor,
} from './employee-schedule-colors';

describe('employee-schedule-colors', () => {
  it('picks stable default color from employee id', () => {
    const a = defaultEmployeeScheduleColor('abc123');
    const b = defaultEmployeeScheduleColor('abc123');
    expect(a).toBe(b);
    expect(EMPLOYEE_SCHEDULE_COLORS).toContain(a);
  });

  it('uses custom hex when valid', () => {
    expect(resolveEmployeeScheduleColor('x', '#ff0000')).toBe('#ff0000');
  });

  it('falls back when custom color invalid', () => {
    expect(resolveEmployeeScheduleColor('emp1', 'red')).toBe(defaultEmployeeScheduleColor('emp1'));
  });
});
