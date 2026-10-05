import { NextResponse } from 'next/server';
import { requireAnyPermission } from '@crm/auth';
import {
  buildIcsCalendar,
  getSchedulePlanGrid,
  listPlanEntries,
  scheduleEntryToIcsEvent,
  HR_SCHEDULE_READ_PERMISSION_KEYS,
} from '@crm/hr';
import { getAppUrl } from '@crm/mail/env';

/** Whole-plan calendar for the planner — every employee's shifts in one file. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAnyPermission([...HR_SCHEDULE_READ_PERMISSION_KEYS]);

  const { id } = await params;
  const grid = await getSchedulePlanGrid(id);
  if (!grid) return new NextResponse('Not found', { status: 404 });

  const names = new Map(grid.employees.map((e) => [String(e._id), e.name]));
  const entries = await listPlanEntries(grid.plan._id);
  const appUrl = getAppUrl();

  const ics = buildIcsCalendar(
    entries.map((entry) => {
      const event = scheduleEntryToIcsEvent(entry, appUrl);
      const name = names.get(String(entry.employeeId));
      return { ...event, summary: name ? `${name} — ${event.summary}` : event.summary };
    }),
    { calendarName: grid.plan.title, reminderMinutes: 60 }
  );

  const filename = `beosztas-${grid.plan.title.replace(/[^\w-]+/g, '-').toLowerCase()}.ics`;

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
