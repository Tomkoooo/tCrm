import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeftIcon, DownloadIcon } from 'lucide-react';
import { hasAnyPermission, requireAnyPermission } from '@crm/auth';
import {
  describeUnreachableEmployees,
  formatPeriodLabel,
  getSchedulePlanGrid,
  listCompanies,
  listEmployees,
  listPlanChangeRequests,
  HR_SCHEDULE_READ_PERMISSION_KEYS,
  HR_SCHEDULE_WRITE_PERMISSION_KEYS,
} from '@crm/hr';
import { Badge, Button, Container } from '@crm/ui';
import { SchedulePlanEditor } from '../_components/schedule-plan-editor';
import { SchedulePlanRequests } from '../_components/schedule-plan-requests';

export default async function SchedulePlanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAnyPermission([...HR_SCHEDULE_READ_PERMISSION_KEYS]);

  const { id } = await params;
  const sp = await searchParams;
  const tab = sp.tab === 'requests' ? 'requests' : 'grid';

  const grid = await getSchedulePlanGrid(id);
  if (!grid) notFound();

  const canWrite = await hasAnyPermission([...HR_SCHEDULE_WRITE_PERMISSION_KEYS]);

  const [companies, companyEmployees, requests] = await Promise.all([
    listCompanies({ activeOnly: false }),
    listEmployees({ activeOnly: true, companyId: grid.plan.companyId }),
    listPlanChangeRequests(grid.plan._id),
  ]);

  const companyName =
    companies.find((c) => String(c._id) === String(grid.plan.companyId))?.name ?? '—';
  const employeeNames = new Map(companyEmployees.map((e) => [String(e._id), e.name]));
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const unreachable = describeUnreachableEmployees(grid.employees);

  const planId = String(grid.plan._id);

  return (
    <Container className="flex max-w-[110rem] flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-2">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href="/hr/schedules">
            <ArrowLeftIcon className="h-4 w-4" />
            Beosztások
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{grid.plan.title}</h1>
              <Badge variant={grid.plan.status === 'published' ? 'default' : 'outline'}>
                {grid.plan.status === 'published' ? 'Kiküldve' : 'Piszkozat'}
              </Badge>
              {grid.plan.publishCount > 1 ? (
                <Badge variant="secondary">{grid.plan.publishCount}. kiküldés</Badge>
              ) : null}
            </div>
            <p className="text-muted-foreground text-sm">
              {companyName} · {formatPeriodLabel(grid.plan)} · {grid.employees.length} dolgozó ·{' '}
              {grid.cells.size} műszak
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/hr/schedules/${planId}/export.ics`}>
              <DownloadIcon className="h-4 w-4" />
              Naptár (.ics)
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        <Link
          href={`/hr/schedules/${planId}`}
          className={
            tab === 'grid'
              ? 'border-primary -mb-px border-b-2 px-3 py-2 text-sm font-medium'
              : 'text-muted-foreground hover:text-foreground px-3 py-2 text-sm'
          }
        >
          Beosztás rács
        </Link>
        <Link
          href={`/hr/schedules/${planId}?tab=requests`}
          className={
            tab === 'requests'
              ? 'border-primary -mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium'
              : 'text-muted-foreground hover:text-foreground flex items-center gap-2 px-3 py-2 text-sm'
          }
        >
          Módosítási kérelmek
          {pendingCount > 0 ? <Badge variant="destructive">{pendingCount}</Badge> : null}
        </Link>
      </div>

      {tab === 'requests' ? (
        <SchedulePlanRequests
          canWrite={canWrite}
          requests={requests.map((r) => ({
            id: String(r._id),
            employeeName: employeeNames.get(String(r.employeeId)) ?? 'Dolgozó',
            status: r.status,
            originalStart: r.originalStart.toISOString(),
            originalEnd: r.originalEnd.toISOString(),
            proposedStart: r.proposedStart.toISOString(),
            proposedEnd: r.proposedEnd.toISOString(),
            note: r.note,
            reviewNote: r.reviewNote,
            createdAt: r.createdAt.toISOString(),
          }))}
        />
      ) : (
        <SchedulePlanEditor
          canWrite={canWrite}
          planId={planId}
          status={grid.plan.status}
          title={grid.plan.title}
          notes={grid.plan.notes}
          defaultShiftMinutes={grid.plan.defaultShiftMinutes}
          dayKeys={grid.dayKeys}
          employees={grid.employees.map((e) => ({
            id: String(e._id),
            name: e.name,
            email: e.email,
            hasUser: Boolean(e.userId),
          }))}
          candidateEmployees={companyEmployees.map((e) => ({
            id: String(e._id),
            name: e.name,
            email: e.email,
            hasUser: Boolean(e.userId),
          }))}
          cells={Object.fromEntries(
            [...grid.cells.entries()].map(([key, cell]) => [
              key,
              { label: cell.label, durationMinutes: cell.durationMinutes },
            ])
          )}
          dayNotes={Object.fromEntries(grid.dayNotes)}
          unreachable={unreachable}
        />
      )}
    </Container>
  );
}
