import Link from 'next/link';
import { hasAnyPermission, requireAnyPermission } from '@crm/auth';
import { connectDB, Employee } from '@crm/db-core';
import {
  listTimeOff,
  listEmployees,
  HR_READ_PERMISSION_KEYS,
  HR_WRITE_PERMISSION_KEYS,
  HR_APPROVE_PERMISSION_KEYS,
} from '@crm/hr';
import { formatDateTime } from '@crm/lib';
import { Container, Card, CardContent, CardHeader, CardTitle, Badge } from '@crm/ui';
import { TimeOffReviewButtons } from '../_components/time-off-review-buttons';
import { LeavePageClient } from './_components/leave-page-client';

export default async function HrLeavePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAnyPermission([...HR_READ_PERMISSION_KEYS, ...HR_APPROVE_PERMISSION_KEYS]);
  const sp = await searchParams;
  const statusFilter =
    typeof sp.status === 'string' && ['pending', 'approved', 'rejected'].includes(sp.status)
      ? (sp.status as 'pending' | 'approved' | 'rejected')
      : undefined;

  const canWrite = await hasAnyPermission([...HR_WRITE_PERMISSION_KEYS]);
  const canApprove = await hasAnyPermission([...HR_APPROVE_PERMISSION_KEYS]);

  const [requests, employees] = await Promise.all([
    listTimeOff(statusFilter ? { status: statusFilter } : undefined),
    canWrite ? listEmployees({ activeOnly: true }) : Promise.resolve([]),
  ]);

  await connectDB();
  const empIds = [...new Set(requests.map((r) => String(r.employeeId)))];
  const empDocs = await Employee.find({ _id: { $in: empIds } })
    .select({ name: 1 })
    .lean()
    .exec();
  const nameMap = new Map(empDocs.map((e) => [String(e._id), e.name]));

  const rows = requests.map((r) => ({
    id: String(r._id),
    employeeName: nameMap.get(String(r.employeeId)) ?? String(r.employeeId),
    type: r.type,
    status: r.status,
    start: r.start,
    end: r.end,
    note: r.note,
  }));

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Szabadság</h1>
          <p className="text-muted-foreground text-sm">
            Kérelmek és jóváhagyások. Jóváhagyott távollét blokkolja a szállítási beosztást.
          </p>
        </div>
        <LeavePageClient
          canWrite={canWrite}
          employeeOptions={employees.map((e) => ({ id: String(e._id), name: e.name }))}
        />
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href="/hr/leave"
          className={!statusFilter ? 'font-medium underline' : 'text-muted-foreground'}
        >
          Összes
        </Link>
        <Link
          href="/hr/leave?status=pending"
          className={statusFilter === 'pending' ? 'font-medium underline' : 'text-muted-foreground'}
        >
          Függő
        </Link>
        <Link
          href="/hr/leave?status=approved"
          className={
            statusFilter === 'approved' ? 'font-medium underline' : 'text-muted-foreground'
          }
        >
          Jóváhagyott
        </Link>
        <Link
          href="/hr/leave?status=rejected"
          className={
            statusFilter === 'rejected' ? 'font-medium underline' : 'text-muted-foreground'
          }
        >
          Elutasított
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kérelmek</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nincs megjeleníthető kérelem.</p>
          ) : (
            <ul className="divide-y">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{r.employeeName}</span>
                      <Badge variant="outline">
                        {r.type === 'sick' ? 'Betegszabadság' : 'Szabadság'}
                      </Badge>
                      <Badge
                        variant={
                          r.status === 'approved'
                            ? 'default'
                            : r.status === 'rejected'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {r.status === 'approved'
                          ? 'Jóváhagyva'
                          : r.status === 'rejected'
                            ? 'Elutasítva'
                            : 'Függő'}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">
                      {formatDateTime(r.start, 'hu-HU')} – {formatDateTime(r.end, 'hu-HU')}
                    </p>
                    {r.note ? <p className="text-muted-foreground">{r.note}</p> : null}
                  </div>
                  {canApprove && r.status === 'pending' ? <TimeOffReviewButtons id={r.id} /> : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
