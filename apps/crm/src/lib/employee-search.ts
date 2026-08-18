'use server';

import { requireAuth } from '@crm/auth';
import { listEmployees } from '@crm/hr';

export type GroupedEmployeeOption = {
  value: string;
  label: string;
  sublabel?: string;
};

export type GroupedEmployeeGroup = {
  roleKey: string;
  roleName: string;
  options: GroupedEmployeeOption[];
};

export async function searchEmployeesGroupedAction(
  query: string,
  options?: { limit?: number }
): Promise<{ groups: GroupedEmployeeGroup[] }> {
  await requireAuth();
  const employees = await listEmployees({
    activeOnly: true,
    query,
    limit: options?.limit ?? 40,
  });

  const withLogin: GroupedEmployeeOption[] = [];
  const withoutLogin: GroupedEmployeeOption[] = [];

  for (const e of employees) {
    const option: GroupedEmployeeOption = {
      value: String(e._id),
      label: e.name,
      sublabel: e.email || (e.userId ? undefined : 'Nincs CRM fiók'),
    };
    if (e.userId) withLogin.push(option);
    else withoutLogin.push(option);
  }

  const groups: GroupedEmployeeGroup[] = [];
  if (withLogin.length) {
    groups.push({ roleKey: '_linked', roleName: 'CRM fiókkal', options: withLogin });
  }
  if (withoutLogin.length) {
    groups.push({ roleKey: '_unlinked', roleName: 'Csak névjegy', options: withoutLogin });
  }

  return { groups };
}
