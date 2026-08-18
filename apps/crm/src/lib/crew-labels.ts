import type { CrewRole } from '@crm/db-core';

export const CREW_ROLES = ['director', 'pickup', 'driver', 'builder', 'dropoff'] as const;

export const CREW_ROLE_LABELS: Record<CrewRole, string> = {
  director: 'Építésvezető',
  pickup: 'Átvétel',
  driver: 'Sofőr',
  builder: 'Építő',
  dropoff: 'Leadás',
};
