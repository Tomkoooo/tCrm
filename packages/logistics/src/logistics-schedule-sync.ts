import type { ILogisticsJob } from '@crm/db-core';
import type { Types } from 'mongoose';

/**
 * HR schedule sync is Phase 3. Jobs still call this after status changes;
 * it is a no-op until Employee / ScheduleEntry models are restored.
 */
export async function syncLogisticsJobToEmployeeSchedules(
  _job: ILogisticsJob,
  _actorUserId: Types.ObjectId
): Promise<void> {
  return;
}
