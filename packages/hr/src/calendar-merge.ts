export type MergeableScheduleEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  kind?: string;
  employeeId?: string;
  jobId?: string;
  eventName?: string;
  roles?: string[];
  href?: string;
};

/** Logistics sync historically stored "Event · role · pickup". Calendar shows the event name only. */
export function jobEventDisplayName(title?: string): string {
  if (!title?.trim()) return 'Szállítás';
  return title.split(' · ')[0]?.trim() || 'Szállítás';
}

/**
 * One employee can have several crew roles (and pickup rounds) on the same logistics job.
 * Collapse those into a single calendar block so the grid does not overflow.
 */
export function mergeJobScheduleEvents<T extends MergeableScheduleEvent>(events: T[]): T[] {
  const merged = new Map<string, T>();
  const rest: T[] = [];

  for (const event of events) {
    if (event.kind !== 'job' || !event.jobId || !event.employeeId) {
      rest.push(event);
      continue;
    }
    const key = `${event.employeeId}:${event.jobId}`;
    const current = merged.get(key);
    const eventName = event.eventName || jobEventDisplayName(event.title);
    if (!current) {
      merged.set(key, {
        ...event,
        id: `job:${event.employeeId}:${event.jobId}`,
        title: eventName,
        eventName,
        roles: [...(event.roles ?? [])],
      });
      continue;
    }
    if (event.start < current.start) current.start = event.start;
    if (event.end > current.end) current.end = event.end;
    const roles = new Set([...(current.roles ?? []), ...(event.roles ?? [])]);
    current.roles = [...roles];
    current.href = current.href || event.href;
    current.eventName = eventName;
    current.title = eventName;
  }

  return [...merged.values(), ...rest];
}
