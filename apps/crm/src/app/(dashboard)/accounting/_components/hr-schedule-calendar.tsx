'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { hu } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { fetchScheduleEventsAction } from '../schedule/actions';
import { fetchMyScheduleAction } from '../my/actions';

const locales = { hu };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  kind?: string;
  employeeId?: string;
};

export function HrScheduleCalendar({
  mode = 'hr',
  employeeId,
  companyId,
  initialEvents,
}: {
  /** `self` loads only the logged-in user's schedule (no HR permissions). */
  mode?: 'hr' | 'self';
  employeeId?: string;
  companyId?: string;
  initialEvents: CalendarEvent[];
}) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [view, setView] = useState<View>('week');
  const [date, setDate] = useState(new Date());
  const [pending, startTransition] = useTransition();

  const loadRange = useCallback(
    (range: { start: Date; end: Date }) => {
      startTransition(async () => {
        const fetched =
          mode === 'self'
            ? await fetchMyScheduleAction(range.start.toISOString(), range.end.toISOString())
            : await fetchScheduleEventsAction({
                start: range.start.toISOString(),
                end: range.end.toISOString(),
                employeeId,
                companyId,
              });
        setEvents(
          fetched.map((e) => ({
            id: e.id,
            title: e.title,
            start: new Date(e.start),
            end: new Date(e.end),
            allDay: e.allDay,
            kind: e.kind,
            ...('employeeId' in e && e.employeeId ? { employeeId: e.employeeId as string } : {}),
          }))
        );
      });
    },
    [mode, employeeId, companyId]
  );

  const onRangeChange = useCallback(
    (range: Date[] | { start: Date; end: Date }) => {
      if (Array.isArray(range)) {
        if (range.length >= 2) {
          loadRange({ start: range[0], end: range[range.length - 1] });
        }
      } else {
        loadRange(range);
      }
    },
    [loadRange]
  );

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const bg =
      event.kind === 'off'
        ? 'hsl(var(--muted-foreground))'
        : event.kind === 'training'
          ? 'hsl(var(--chart-2))'
          : 'hsl(var(--primary))';
    return { style: { backgroundColor: bg, borderRadius: 4 } };
  }, []);

  const { defaultDate, messages } = useMemo(
    () => ({
      defaultDate: date,
      messages: {
        today: 'Ma',
        previous: 'Előző',
        next: 'Következő',
        month: 'Hónap',
        week: 'Hét',
        day: 'Nap',
        agenda: 'Lista',
      },
    }),
    [date]
  );

  return (
    <div className={`hr-calendar min-h-[500px] ${pending ? 'opacity-70' : ''}`}>
      <Calendar
        localizer={localizer}
        culture="hu"
        events={events}
        startAccessor="start"
        endAccessor="end"
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        defaultDate={defaultDate}
        messages={messages}
        onRangeChange={onRangeChange}
        eventPropGetter={eventStyleGetter}
        style={{ height: 560 }}
      />
    </div>
  );
}
