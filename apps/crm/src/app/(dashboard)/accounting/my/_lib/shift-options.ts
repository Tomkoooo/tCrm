import { formatHrDateTimeLocal, formatHrTime, formatHrDateKey } from '@crm/lib';

export type ShiftOption = {
  id: string;
  label: string;
  proposedStart: string;
  proposedEnd: string;
};

export function buildShiftOptions(
  entries: Array<{
    _id: { toString(): string };
    title?: string;
    start: Date;
    end: Date;
    allDay?: boolean;
    kind: string;
  }>
): ShiftOption[] {
  return entries
    .filter((e) => e.kind !== 'off')
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .map((e) => {
      const title = e.title?.trim() || (e.kind === 'shift' ? 'Műszak' : e.kind);
      const start = new Date(e.start);
      const end = new Date(e.end);
      const label = e.allDay
        ? `${formatHrDateKey(start)} · ${title} (egész nap)`
        : `${formatHrDateKey(start)} ${formatHrTime(start)}–${formatHrTime(end)} · ${title}`;

      return {
        id: e._id.toString(),
        label,
        proposedStart: formatHrDateTimeLocal(start),
        proposedEnd: formatHrDateTimeLocal(end),
      };
    });
}
