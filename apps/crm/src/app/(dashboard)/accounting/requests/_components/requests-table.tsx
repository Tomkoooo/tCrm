'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DataTable } from '@crm/ui';
import type { ColumnDef, DataTableQuery } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { approveRequestAction, rejectRequestAction } from '../actions';

export type RequestRow = {
  _id: string;
  employeeName: string;
  companyName: string;
  typeKey: string;
  type: string;
  statusKey: string;
  status: string;
  periodLabel: string;
  originalScheduleLabel?: string;
  proposedScheduleLabel?: string;
  originalTitle?: string;
  startLabel: string;
  endLabel: string;
  reason?: string;
  sickPayAmount?: number;
  submittedAtLabel: string;
  reviewNote?: string;
  reviewedAtLabel?: string;
};

const TYPE_LABELS: Record<string, string> = {
  holiday: 'Szabadság',
  sick_leave: 'Betegszabadság',
  schedule_change: 'Beosztás módosítás',
};

export function RequestsTable({
  data,
  columns,
  query,
  total,
  canApprove,
}: {
  data: RequestRow[];
  columns: Array<ColumnDef<RequestRow>>;
  query: DataTableQuery;
  total: number;
  canApprove: boolean;
}) {
  return (
    <DataTable<RequestRow>
      mode="server"
      tableId="accounting-requests"
      data={data}
      columns={columns}
      query={query}
      total={total}
      basePath="/accounting/requests"
      emptyMessage="Nincs kérelem."
      rowOpen="sheet"
      rowDetail={{
        title: (row) => TYPE_LABELS[row.typeKey] ?? row.typeKey,
        description: (row) => `${row.employeeName} · ${row.companyName}`,
        render: (row) => <RequestDetailPanel row={row} canApprove={canApprove} />,
      }}
    />
  );
}

function RequestDetailPanel({ row, canApprove }: { row: RequestRow; canApprove: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reviewNote, setReviewNote] = useState('');
  const typeLabel = TYPE_LABELS[row.typeKey] ?? row.typeKey;
  const isPending = row.statusKey === 'pending';

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Dolgozó</dt>
          <dd className="font-medium">{row.employeeName}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Cég</dt>
          <dd>{row.companyName}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Típus</dt>
          <dd>{typeLabel}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Státusz</dt>
          <dd>{row.status}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Beküldve</dt>
          <dd>{row.submittedAtLabel}</dd>
        </div>
        {row.typeKey === 'schedule_change' ? (
          <>
            <div>
              <dt className="text-muted-foreground">Jelenlegi műszak</dt>
              <dd>
                {row.originalTitle ? `${row.originalTitle} — ` : null}
                {row.originalScheduleLabel ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Javasolt műszak</dt>
              <dd className="font-medium">{row.proposedScheduleLabel ?? row.periodLabel}</dd>
            </div>
          </>
        ) : (
          <div>
            <dt className="text-muted-foreground">Időszak</dt>
            <dd>{row.periodLabel}</dd>
          </div>
        )}
        {row.reason ? (
          <div>
            <dt className="text-muted-foreground">Indoklás</dt>
            <dd className="whitespace-pre-wrap">{row.reason}</dd>
          </div>
        ) : null}
        {row.sickPayAmount != null ? (
          <div>
            <dt className="text-muted-foreground">Táppénz összeg (HUF)</dt>
            <dd>{row.sickPayAmount.toLocaleString('hu-HU')}</dd>
          </div>
        ) : null}
        {row.reviewedAtLabel ? (
          <div>
            <dt className="text-muted-foreground">Elbírálva</dt>
            <dd>{row.reviewedAtLabel}</dd>
          </div>
        ) : null}
        {row.reviewNote ? (
          <div>
            <dt className="text-muted-foreground">Elbíráló megjegyzése</dt>
            <dd className="whitespace-pre-wrap">{row.reviewNote}</dd>
          </div>
        ) : null}
      </dl>

      {isPending && canApprove ? (
        <div className="border-border flex flex-col gap-3 border-t pt-4">
          <div className="space-y-2">
            <Label htmlFor="reviewNote">Megjegyzés (opcionális)</Label>
            <Input
              id="reviewNote"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Pl. csak részben engedélyezve"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              loading={pending}
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const res = await approveRequestAction(row._id, reviewNote || undefined);
                  if (res.success) {
                    toast.success(res.message);
                    router.refresh();
                  } else toast.error(res.message);
                });
              }}
            >
              Jóváhagyás
            </Button>
            <Button
              size="sm"
              variant="outline"
              loading={pending}
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const res = await rejectRequestAction(row._id, reviewNote || undefined);
                  if (res.success) {
                    toast.success(res.message);
                    router.refresh();
                  } else toast.error(res.message);
                });
              }}
            >
              Elutasítás
            </Button>
          </div>
        </div>
      ) : null}

      {isPending && !canApprove ? (
        <p className="text-muted-foreground border-border border-t pt-4 text-sm">
          A kérelem jóváhagyásához vagy elutasításához <strong>hr:approve</strong> vagy{' '}
          <strong>hr:write</strong> jogosultság szükséges.
        </p>
      ) : null}
    </div>
  );
}
