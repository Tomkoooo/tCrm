/** Outlook-szerű naptár színpaletta dolgozónként. */
export const EMPLOYEE_SCHEDULE_COLORS = [
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#ea580c',
  '#ca8a04',
  '#16a34a',
  '#0891b2',
  '#4f46e5',
  '#c026d3',
  '#dc2626',
  '#0d9488',
  '#9333ea',
] as const;

export type EmployeeScheduleColor = (typeof EMPLOYEE_SCHEDULE_COLORS)[number];

export function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function defaultEmployeeScheduleColor(employeeId: string): EmployeeScheduleColor {
  const index = hashString(employeeId) % EMPLOYEE_SCHEDULE_COLORS.length;
  return EMPLOYEE_SCHEDULE_COLORS[index]!;
}

export function resolveEmployeeScheduleColor(
  employeeId: string,
  calendarColor?: string | null
): string {
  if (calendarColor && /^#[0-9a-fA-F]{6}$/.test(calendarColor)) {
    return calendarColor;
  }
  return defaultEmployeeScheduleColor(employeeId);
}

export function scheduleKindFallbackColor(kind?: string): string {
  switch (kind) {
    case 'off':
      return '#64748b';
    case 'training':
      return '#0d9488';
    case 'other':
      return '#a855f7';
    case 'field_work':
      return '#ea580c';
    default:
      return '#2563eb';
  }
}

/** Háttér + sötétebb szegély Outlook-stílushoz. */
export function scheduleEventStyles(baseColor: string): {
  backgroundColor: string;
  borderColor: string;
  color: string;
} {
  return {
    backgroundColor: baseColor,
    borderColor: baseColor,
    color: '#ffffff',
  };
}
