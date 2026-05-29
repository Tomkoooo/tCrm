import type { JobStatus } from '@crm/db';

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: 'Tervezet',
  scheduled: 'Ütemezve',
  gathered: 'Összeszedve',
  picked_up: 'Átvéve',
  delivered: 'Helyszínen',
  returning: 'Visszaszállítás',
  completed: 'Lezárva',
  cancelled: 'Törölve',
};
