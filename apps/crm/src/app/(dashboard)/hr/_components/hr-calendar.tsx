'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { hu } from 'date-fns/locale';
import {
  formatHrTime,
  resolveEmployeeScheduleColor,
  scheduleEventStyles,
  scheduleKindFallbackColor,
  toCalendarDate,
} from '@crm/lib';
import { CREW_ROLE_LABELS } from '@/lib/crew-labels';
import {
  fetchHrCalendarEventsAction,
  fetchMyCalendarEventsAction,
  type CalendarEventDTO,
} from '../calendar-actions';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './hr-calendar.css';

const locales = { hu };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

export type HrCalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  kind?: string;
  employeeId?: string;
  employeeName?: string;
  color?: string;
  href?: string;
  editable: boolean;
  jobId?: string;
  eventName?: string;
  roles?: string[];
  notes?: string;
};

export type HrCalendarResource = {
  id: string;
  title: string;
};

function hydrate(raw: CalendarEventDTO): HrCalendarEvent {
  return {
    ...raw,
    start: toCalendarDate(raw.start),
    end: toCalendarDate(raw.end),
    color:
      raw.color ??
      (raw.employeeId
        ? resolveEmployeeScheduleColor(raw.employeeId)
        : scheduleKindFallbackColor(raw.kind)),
  };
}

function eventRoleLabels(event: HrCalendarEvent): string {
  if (!event.roles?.length) return '';
  return event.roles
    .map((role) => CREW_ROLE_LABELS[role as keyof typeof CREW_ROLE_LABELS] ?? role)
    .join(' · ');
}

function eventTimeLabel(event: HrCalendarEvent): string {
  return `${formatHrTime(event.start)} – ${formatHrTime(event.end)}`;
}

function eventTooltip(event: HrCalendarEvent): string {
  const lines = [event.eventName || event.title];
  if (event.employeeName) lines.push(event.employeeName);
  const roles = eventRoleLabels(event);
  if (roles) lines.push(roles);
  if (event.notes) lines.push(event.notes);
  lines.push(eventTimeLabel(event));
  return lines.join('\n');
}

function CalendarEventBlock({
  event,
  showEmployee,
  detail,
}: {
  event: HrCalendarEvent;
  showEmployee: boolean;
  detail: boolean;
}) {
  const roles = eventRoleLabels(event);
  return (
    <div
      className={`hr-schedule-event${detail ? 'hr-schedule-event--detail' : ''}`}
      title={eventTooltip(event)}
    >
      <span className="hr-schedule-event__title">{event.eventName || event.title}</span>
      <span className="hr-schedule-event__time">{eventTimeLabel(event)}</span>
      {roles ? <span className="hr-schedule-event__roles">{roles}</span> : null}
      {showEmployee && event.employeeName ? (
        <span className="hr-schedule-event__meta">{event.employeeName}</span>
      ) : null}
    </div>
  );
}

export function HrCalendar({
  mode,
  companyId,
  employeeId,
  resources,
  onSelectEvent,
  editable = false,
}: {
  mode: 'hr' | 'self';
  companyId?: string;
  employeeId?: string;
  resources?: HrCalendarResource[];
  onSelectEvent?: (event: HrCalendarEvent) => void;
  editable?: boolean;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>('week');
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState<HrCalendarEvent[]>([]);
  const [pending, startTransition] = useTransition();
  const groupView = mode === 'hr' && !employeeId && (resources?.length ?? 0) > 1;

  const loadRange = useCallback(
    (range: { start: Date; end: Date }) => {
      startTransition(async () => {
        const fetched =
          mode === 'self'
            ? await fetchMyCalendarEventsAction({
                start: range.start.toISOString(),
                end: range.end.toISOString(),
                employeeId,
              })
            : await fetchHrCalendarEventsAction({
                start: range.start.toISOString(),
                end: range.end.toISOString(),
                companyId,
                employeeId,
              });
        setEvents(fetched.map(hydrate));
      });
    },
    [mode, companyId, employeeId]
  );

  useEffect(() => {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    loadRange({ start, end });
  }, [date, loadRange]);

  const onRangeChange = useCallback(
    (range: Date[] | { start: Date; end: Date }) => {
      if (Array.isArray(range)) {
        if (range.length >= 2) loadRange({ start: range[0]!, end: range[range.length - 1]! });
      } else {
        loadRange(range);
      }
    },
    [loadRange]
  );

  const eventStyleGetter = useCallback(
    (event: HrCalendarEvent) => {
      const base =
        event.color ??
        (event.employeeId
          ? resolveEmployeeScheduleColor(event.employeeId)
          : scheduleKindFallbackColor(event.kind));
      return {
        style: {
          ...scheduleEventStyles(base),
          opacity: event.kind === 'off' ? 0.88 : 1,
          cursor: event.href || (editable && event.editable) ? 'pointer' : undefined,
        },
      };
    },
    [editable]
  );

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
    }),
    []
  );

  const dayResources = useMemo(() => {
    if (!groupView || view !== 'day' || !resources?.length) return [];
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const busy = new Set(
      events
        .filter((event) => event.employeeId && event.start < dayEnd && event.end > dayStart)
        .map((event) => event.employeeId as string)
    );
    return resources.filter((person) => busy.has(person.id));
  }, [groupView, view, resources, events, date]);

  const useResources = dayResources.length > 0;

  const legendPeople = useMemo(() => {
    if (!groupView || useResources || !resources?.length) return [];
    const colors = new Map<string, string>();
    for (const event of events) {
      if (event.employeeId && event.color && !colors.has(event.employeeId)) {
        colors.set(event.employeeId, event.color);
      }
    }
    return resources
      .filter((person) => colors.has(person.id))
      .map((person) => ({
        ...person,
        color: colors.get(person.id) ?? resolveEmployeeScheduleColor(person.id),
      }));
  }, [groupView, useResources, resources, events]);

  const components = useMemo(
    () => ({
      event: ({ event }: { event: HrCalendarEvent }) => (
        <CalendarEventBlock
          event={event}
          showEmployee={groupView && view === 'week'}
          detail={view === 'day'}
        />
      ),
      agenda: {
        event: ({ event }: { event: HrCalendarEvent }) => {
          const roles = eventRoleLabels(event);
          return (
            <span>
              {event.eventName || event.title}
              {roles ? ` · ${roles}` : ''}
              {groupView && event.employeeName ? ` · ${event.employeeName}` : ''}
            </span>
          );
        },
      },
    }),
    [groupView, view]
  );

  return (
    <div
      className={`hr-schedule-calendar ${pending ? 'opacity-70' : ''} ${useResources ? 'hr-schedule-calendar--resources' : ''}`}
    >
      {editable ? (
        <p className="text-muted-foreground mb-2 text-xs">
          Roster műszak: kattints a szerkesztéshez. Logisztikai feladat és távollét csak olvasható.
        </p>
      ) : null}
      {groupView ? (
        <p className="text-muted-foreground mb-2 text-xs">
          Szállítás: egy blokk eseményenként. Szerepek és idő a napi nézetben, illetve a nagyobb
          heti blokkokon.
        </p>
      ) : null}
      {legendPeople.length > 0 && view !== 'day' ? (
        <div className="hr-schedule-legend">
          {legendPeople.map((person) => (
            <span key={person.id} className="hr-schedule-legend__item">
              <span className="hr-schedule-legend__swatch" style={{ background: person.color }} />
              {person.title}
            </span>
          ))}
        </div>
      ) : null}
      <Calendar<HrCalendarEvent, HrCalendarResource>
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
        onSelectEvent={(ev) => {
          if (ev.href) {
            router.push(ev.href);
            return;
          }
          if (editable && ev.editable) onSelectEvent?.(ev);
        }}
        selectable={false}
        eventPropGetter={eventStyleGetter}
        tooltipAccessor={eventTooltip}
        components={components}
        popup
        showMultiDayTimes
        step={30}
        timeslots={2}
        scrollToTime={scrollToTime}
        min={minTime}
        max={maxTime}
        dayLayoutAlgorithm={groupView && !useResources ? 'no-overlap' : 'overlap'}
        {...(useResources
          ? {
              resources: dayResources,
              resourceIdAccessor: 'id' as const,
              resourceTitleAccessor: 'title' as const,
              resourceAccessor: (event: HrCalendarEvent) => event.employeeId,
            }
          : {})}
        style={{ height: useResources ? 720 : 640 }}
      />
    </div>
  );
}
