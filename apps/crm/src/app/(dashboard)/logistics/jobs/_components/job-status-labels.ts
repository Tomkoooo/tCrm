import type { JobStatus } from '@crm/db-core';

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: 'Tervezet',
  scheduled: 'Ütemezve',
  picked_up: 'Átvéve',
  completed: 'Lezárva',
  cancelled: 'Törölve',
};
