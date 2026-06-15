'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { Calendar, dateFnsLocalizer, type EventProps, type View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { hu } from 'date-fns/locale';
import {
  formatHrTime,
  resolveEmployeeScheduleColor,
  scheduleEventStyles,
  scheduleKindFallbackColor,
  toCalendarDate,
} from '@crm/lib';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './hr-schedule-calendar.css';
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
  start: Date | string;
  end: Date | string;
  allDay?: boolean;
  kind?: string;
  employeeId?: string;
  employeeName?: string;
  color?: string;
};

export type EmployeeCalendarMeta = {
  _id: string;
  name: string;
  color: string;
};

type FetchedEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  kind?: string;
  employeeId?: string;
  employeeName?: string;
  color?: string;
};

function hydrateEvent(
  raw: CalendarEvent | FetchedEvent
): CalendarEvent & { start: Date; end: Date } {
  const employeeId = raw.employeeId;
  const color =
    raw.color ??
    (employeeId ? resolveEmployeeScheduleColor(employeeId) : scheduleKindFallbackColor(raw.kind));

  return {
    ...raw,
    start: toCalendarDate(raw.start),
    end: toCalendarDate(raw.end),
    color,
  };
}

function ScheduleEventCard({ event }: EventProps<CalendarEvent & { start: Date; end: Date }>) {
  const timeLabel = event.allDay
    ? 'Egész nap'
    : `${formatHrTime(event.start)}–${formatHrTime(event.end)}`;

  return (
    <div className="hr-schedule-event" title={`${event.title} · ${timeLabel}`}>
      <span className="hr-schedule-event__title">{event.title}</span>
      {event.employeeName ? (
        <span className="hr-schedule-event__meta">{event.employeeName}</span>
      ) : null}
      <span className="hr-schedule-event__time">{timeLabel}</span>
    </div>
  );
}

function ScheduleLegend({ employees }: { employees: EmployeeCalendarMeta[] }) {
  if (employees.length <= 1) return null;

  return (
    <div className="hr-schedule-legend" aria-label="Dolgozók színei">
      {employees.map((e) => (
        <span key={e._id} className="hr-schedule-legend__item">
          <span className="hr-schedule-legend__swatch" style={{ backgroundColor: e.color }} />
          {e.name}
        </span>
      ))}
    </div>
  );
}

export function HrScheduleCalendar({
  mode = 'hr',
  employeeId,
  companyId,
  initialEvents,
  employeeLegend = [],
}: {
  mode?: 'hr' | 'self';
  employeeId?: string;
  companyId?: string;
  initialEvents: CalendarEvent[];
  employeeLegend?: EmployeeCalendarMeta[];
}) {
  const [events, setEvents] = useState(() => initialEvents.map(hydrateEvent));
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
        setEvents(fetched.map(hydrateEvent));
      });
    },
    [mode, employeeId, companyId]
  );

  const onRangeChange = useCallback(
    (range: Date[] | { start: Date; end: Date }) => {
      if (Array.isArray(range)) {
        if (range.length >= 2) {
          loadRange({ start: range[0]!, end: range[range.length - 1]! });
        }
      } else {
        loadRange(range);
      }
    },
    [loadRange]
  );

  const eventStyleGetter = useCallback((event: CalendarEvent & { start: Date; end: Date }) => {
    const baseColor =
      event.color ??
      (event.employeeId
        ? resolveEmployeeScheduleColor(event.employeeId)
        : scheduleKindFallbackColor(event.kind));
    const styles = scheduleEventStyles(baseColor);
    return {
      style: {
        ...styles,
        borderLeftColor: 'rgba(0,0,0,0.28)',
        opacity: event.kind === 'off' ? 0.88 : 1,
      },
    };
  }, []);

  const { messages, scrollToTime, minTime, maxTime } = useMemo(
    () => ({
      messages: {
        today: 'Ma',
        previous: 'Előző',
        next: 'Következő',
        month: 'Hónap',
        week: 'Hét',
        day: 'Nap',
        agenda: 'Lista',
        showMore: (total: number) => `+${total} további`,
      },
      scrollToTime: new Date(1970, 0, 1, 7, 30, 0),
      minTime: new Date(1970, 0, 1, 6, 0, 0),
      maxTime: new Date(1970, 0, 1, 22, 0, 0),
    }),
    []
  );

  const formats = useMemo(
    () => ({
      timeGutterFormat: (d: Date) => formatHrTime(d),
      eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
        `${formatHrTime(start)} – ${formatHrTime(end)}`,
      agendaTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
        `${formatHrTime(start)} – ${formatHrTime(end)}`,
    }),
    []
  );

  return (
    <div className={`hr-schedule-calendar ${pending ? 'opacity-70' : ''}`}>
      <ScheduleLegend employees={employeeLegend} />
      <Calendar
        localizer={localizer}
        culture="hu"
        events={events}
        startAccessor="start"
        endAccessor="end"
        view={view}
        views={['month', 'week', 'day', 'agenda']}
        onView={setView}
        date={date}
        onNavigate={setDate}
        messages={messages}
        formats={formats}
        onRangeChange={onRangeChange}
        eventPropGetter={eventStyleGetter}
        components={{ event: ScheduleEventCard }}
        popup
        showMultiDayTimes
        step={30}
        timeslots={2}
        scrollToTime={scrollToTime}
        min={minTime}
        max={maxTime}
        style={{ height: 640 }}
      />
    </div>
  );
}
