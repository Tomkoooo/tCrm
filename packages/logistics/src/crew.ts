import type { CrewRole, IJobCrewMember, ILogisticsJob } from '@crm/db-core';
import { CREW_ROLES } from '@crm/db-core';
import type { Types } from 'mongoose';

export const CREW_ROLE_LABELS: Record<CrewRole, string> = {
  director: 'Építésvezető',
  pickup: 'Átvétel',
  driver: 'Sofőr',
  builder: 'Építő',
  dropoff: 'Leadás',
};

export { CREW_ROLES };

export function isCrewRole(value: string): value is CrewRole {
  return (CREW_ROLES as readonly string[]).includes(value);
}

export function directorCount(crew: IJobCrewMember[]): number {
  return crew.filter((m) => m.roles.includes('director')).length;
}

export function assertValidCrew(crew: IJobCrewMember[]): void {
  if (!crew.length) {
    throw new Error('Legalább egy csapattag szükséges.');
  }
  if (directorCount(crew) !== 1) {
    throw new Error('Pontosan egy építésvezetőt kell kijelölni.');
  }
  for (const member of crew) {
    if (!member.roles.length) {
      throw new Error('Minden csapattagnak legyen legalább egy szerepe.');
    }
  }
}

export function employeeIdsForRole(crew: IJobCrewMember[], role: CrewRole): Types.ObjectId[] {
  return crew.filter((m) => m.roles.includes(role)).map((m) => m.employeeId);
}

export function allCrewEmployeeIds(crew: IJobCrewMember[]): Types.ObjectId[] {
  return [...new Set(crew.map((m) => String(m.employeeId)))].map(
    (id) => crew.find((m) => String(m.employeeId) === id)!.employeeId
  );
}

export function memberHasRole(
  crew: IJobCrewMember[],
  employeeId: Types.ObjectId,
  roles: CrewRole[]
): boolean {
  const member = crew.find((m) => m.employeeId.equals(employeeId));
  if (!member) return false;
  return roles.some((r) => member.roles.includes(r));
}

export function pickupCrewEmployeeIds(job: ILogisticsJob): Types.ObjectId[] {
  const fromRoles = [
    ...employeeIdsForRole(job.crew ?? [], 'pickup'),
    ...employeeIdsForRole(job.crew ?? [], 'driver'),
    ...employeeIdsForRole(job.crew ?? [], 'dropoff'),
  ];
  if (fromRoles.length) return fromRoles;
  return (job.pickups ?? []).flatMap((p) => p.employeeIds ?? []);
}
