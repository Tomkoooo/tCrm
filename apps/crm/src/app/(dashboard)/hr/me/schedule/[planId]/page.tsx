import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeftIcon, CalendarIcon, DownloadIcon } from 'lucide-react';
import { getCurrentUser } from '@crm/auth';
import {
  calendarFeedPath,
  cellKey,
  ensureEmployeeCalendarToken,
  formatPeriodLabel,
  getSchedulePlanGrid,
  listMembershipsForUser,
  listScheduleChangeRequests,
} from '@crm/hr';
import { getAppUrl } from '@crm/mail/env';
import { Badge, Button, Container } from '@crm/ui';
import { MyScheduleTable } from '../../_components/my-schedule-table';

/** An employee's own column of a published plan, with the change-request flow. */
export default async function MySchedulePage({ params }: { params: Promise<{ planId: string }> }) {
  const user = await getCurrentUser();
  if (!user) notFound();

  const { planId } = await params;
  const grid = await getSchedulePlanGrid(planId);
  if (!grid) notFound();

  const memberships = await listMembershipsForUser(user.id);
  const mine = memberships.find((m) => grid.plan.employeeIds.some((id) => id.equals(m._id)));

  // Not on this plan → the plan simply does not exist for this user.
  if (!mine) notFound();

  const employeeId = String(mine._id);
  const myCells = grid.dayKeys
    .map((dayKey) => ({ dayKey, cell: grid.cells.get(cellKey(employeeId, dayKey)) }))
    .filter((row): row is { dayKey: string; cell: NonNullable<typeof row.cell> } =>
      Boolean(row.cell)
    );

  const requests = await listScheduleChangeRequests({ employeeId });
  const requestByEntry = new Map(
    requests
      .filter((r) => r.status === 'pending')
      .map((r) => [String(r.scheduleEntryId), String(r._id)])
  );

  const feedToken = await ensureEmployeeCalendarToken(mine._id);
  const appUrl = getAppUrl();
  const feedUrl = `${appUrl}${calendarFeedPath(feedToken)}`;

  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-2">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href="/hr/me">
            <ArrowLeftIcon className="h-4 w-4" />
            Saját feladataim
          </Link>
        </Button>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{grid.plan.title}</h1>
            {grid.plan.status === 'published' ? null : <Badge variant="outline">Piszkozat</Badge>}
          </div>
          <p className="text-muted-foreground text-sm">
            {mine.name} · {formatPeriodLabel(grid.plan)} · {myCells.length} műszak
          </p>
        </div>
      </div>

      {grid.plan.notes ? (
        <p className="bg-muted/50 rounded-md p-3 text-sm">{grid.plan.notes}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={feedUrl.replace(/^https?:/, 'webcal:')}>
            <CalendarIcon className="h-4 w-4" />
            Naptár feliratkozás
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/api/calendar/plan/${planId}/${feedToken}.ics`}>
            <DownloadIcon className="h-4 w-4" />
            .ics letöltés
          </Link>
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        A feliratkozás a Google Naptárban, iCloudban és Outlookban is működik, és automatikusan
        követi a módosításokat. A link személyes — ne add tovább.
      </p>

      <MyScheduleTable
        dayNotes={Object.fromEntries(grid.dayNotes)}
        rows={myCells.map(({ dayKey, cell }) => ({
          dayKey,
          entryId: cell.entryId,
          label: cell.label,
          start: cell.start.toISOString(),
          end: cell.end.toISOString(),
          pendingRequestId: requestByEntry.get(cell.entryId),
        }))}
      />
    </Container>
  );
}
