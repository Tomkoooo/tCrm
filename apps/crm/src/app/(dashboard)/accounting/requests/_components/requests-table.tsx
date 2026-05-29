'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DataTable } from '@crm/ui';
import type { ColumnDef, DataTableQuery } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { approveRequestAction, rejectRequestAction } from '../actions';

export type RequestRow = {
  _id: string;
  employeeName: string;
  companyName: string;
  typeKey: string;
  type: string;
  status: string;
  startLabel: string;
  endLabel: string;
  reason?: string;
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
      rowOpen={canApprove ? 'sheet' : 'navigate'}
      rowDetail={
        canApprove
          ? {
              title: (row) => TYPE_LABELS[row.typeKey] ?? row.typeKey,
              render: (row) => (
                <RequestActions row={row} typeLabel={TYPE_LABELS[row.typeKey] ?? row.typeKey} />
              ),
            }
          : undefined
      }
    />
  );
}

function RequestActions({ row, typeLabel }: { row: RequestRow; typeLabel: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (row.status !== 'pending') {
    return (
      <p className="text-muted-foreground text-sm">
        {typeLabel} — {row.status}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      <p className="text-sm">
        <strong>{row.employeeName}</strong> ({row.companyName}) — {typeLabel}
        <br />
        {row.startLabel} – {row.endLabel}
        {row.reason ? <br /> : null}
        {row.reason}
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const res = await approveRequestAction(row._id);
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
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const res = await rejectRequestAction(row._id);
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
  );
}
