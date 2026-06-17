'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { Calendar, dateFnsLocalizer, type EventProps, type View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { hu } from 'date-fns/locale';
import { Palette } from 'lucide-react';
import {
  formatHrTime,
  resolveEmployeeScheduleColor,
  scheduleEventStyles,
  scheduleKindFallbackColor,
  toCalendarDate,
} from '@crm/lib';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './hr-schedule-calendar.css';
import { fetchScheduleEventsAction, fetchTeamScheduleEventsAction } from '../schedule/actions';
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

type HydratedEvent = CalendarEvent & { start: Date; end: Date };

function hydrateEvent(raw: CalendarEvent | FetchedEvent): HydratedEvent {
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

function ScheduleEventCard({ event }: EventProps<HydratedEvent>) {
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

function ScheduleLegendDialog({ employees }: { employees: EmployeeCalendarMeta[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => e.name.toLowerCase().includes(q));
  }, [employees, query]);

  if (employees.length <= 1) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="hr-schedule-legend-trigger"
          title="Dolgozók naptárszínei"
        >
          <Palette className="mr-1.5 h-3.5 w-3.5" />
          Színjelmagyarázat ({employees.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[min(85dvh,32rem)] flex-col gap-3 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dolgozók színei</DialogTitle>
          <DialogDescription>
            A naptárban minden dolgozó saját színnel jelenik meg. Szín a dolgozó adatlapján
            állítható.
          </DialogDescription>
        </DialogHeader>
        <Input
          type="search"
          placeholder="Keresés név szerint…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Dolgozó keresése"
        />
        <ul className="min-h-0 flex-1 overflow-y-auto rounded-md border">
          {filtered.length === 0 ? (
            <li className="text-muted-foreground px-3 py-4 text-center text-sm">Nincs találat.</li>
          ) : (
            filtered.map((e) => (
              <li
                key={e._id}
                className="flex items-center gap-2 border-b px-3 py-2 text-sm last:border-b-0"
              >
                <span
                  className="hr-schedule-legend__swatch size-3 shrink-0"
                  style={{ backgroundColor: e.color }}
                  aria-hidden
                />
                <span className="min-w-0 truncate">{e.name}</span>
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

export function HrScheduleCalendar({
  mode = 'hr',
  employeeId,
  companyId,
  initialEvents,
  employeeLegend = [],
  editable = false,
  onSelectEvent,
}: {
  mode?: 'hr' | 'self' | 'team';
  employeeId?: string;
  companyId?: string;
  initialEvents: CalendarEvent[];
  employeeLegend?: EmployeeCalendarMeta[];
  editable?: boolean;
  onSelectEvent?: (event: CalendarEvent) => void;
}) {
  const [events, setEvents] = useState(() => initialEvents.map(hydrateEvent));
  const [view, setView] = useState<View>('week');
  const [date, setDate] = useState(new Date());
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setEvents(initialEvents.map(hydrateEvent));
  }, [initialEvents]);

  const loadRange = useCallback(
    (range: { start: Date; end: Date }) => {
      startTransition(async () => {
        const fetched =
          mode === 'self'
            ? await fetchMyScheduleAction(range.start.toISOString(), range.end.toISOString())
            : mode === 'team'
              ? await fetchTeamScheduleEventsAction({
                  start: range.start.toISOString(),
                  end: range.end.toISOString(),
                  companyId,
                })
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

  const handleSelectEvent = useCallback(
    (event: HydratedEvent) => {
      if (!editable || !onSelectEvent) return;
      onSelectEvent(event);
    },
    [editable, onSelectEvent]
  );

  const eventStyleGetter = useCallback(
    (event: HydratedEvent) => {
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
          cursor: editable ? 'pointer' : undefined,
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
      agendaTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
        `${formatHrTime(start)} – ${formatHrTime(end)}`,
    }),
    []
  );

  return (
    <div className={`hr-schedule-calendar ${pending ? 'opacity-70' : ''}`}>
      <div className="hr-schedule-calendar__toolbar">
        <ScheduleLegendDialog employees={employeeLegend} />
        {editable ? (
          <p className="text-muted-foreground text-xs sm:text-sm">
            Kattintson egy eseményre a szerkesztéshez.
          </p>
        ) : null}
      </div>
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
        onSelectEvent={editable ? handleSelectEvent : undefined}
        selectable={false}
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
