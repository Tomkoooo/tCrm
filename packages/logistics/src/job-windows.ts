import type { ILogisticsJob } from '@crm/db-core';

export function resolveWindowsFromDates(params: {
  plannedEventAt?: Date;
  plannedGatherAt?: Date;
  plannedReturnAt?: Date;
}): {
  gather: Date;
  event: Date;
  returnAt: Date;
} {
  const event =
    params.plannedEventAt ?? params.plannedGatherAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000);
  const gather = params.plannedGatherAt ?? new Date(event.getTime() - 3 * 60 * 60 * 1000);
  let returnAt = params.plannedReturnAt ?? new Date(event.getTime() + 5 * 60 * 60 * 1000);
  if (returnAt <= gather) {
    returnAt = new Date(gather.getTime() + 4 * 60 * 60 * 1000);
  }
  return { gather, event, returnAt };
}

export function resolveJobWindows(job: ILogisticsJob): {
  gather: Date;
  event: Date;
  returnAt: Date;
} {
  return resolveWindowsFromDates({
    plannedEventAt: job.plannedEventAt,
    plannedGatherAt: job.plannedGatherAt,
    plannedReturnAt: job.plannedReturnAt,
  });
}
