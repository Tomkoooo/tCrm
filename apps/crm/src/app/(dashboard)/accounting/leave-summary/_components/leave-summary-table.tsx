'use client';

import { useEffect, useMemo } from 'react';
import { useActionState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@crm/ui';
import type { ColumnDef, DataTableQuery } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { saveLeaveEntitlementAction } from '../actions';
import type { HrFormState } from '../../_components/form-utils';

const MONTH_NAMES = [
  'Január',
  'Február',
  'Március',
  'Április',
  'Május',
  'Június',
  'Július',
  'Augusztus',
  'Szeptember',
  'Október',
  'November',
  'December',
] as const;

type MonthCell = { days: number; datesLabel: string; sickLabel?: string };

export type LeaveSummaryRow = Record<string, unknown> & {
  employeeId: string;
  employeeName: string;
  companyName: string;
  entitlementDays: number;
  usedHolidayDays: number;
  remainingDays: number;
  months: Record<number, MonthCell>;
  personalData?: {
    taj?: string;
    taxId?: string;
  };
};

const defaultQuery: DataTableQuery = { page: 1, pageSize: 50, sort: 'employeeName' };

function EntitlementCell({ row, year }: { row: LeaveSummaryRow; year: number }) {
  const [state, action, pending] = useActionState(saveLeaveEntitlementAction, {
    success: false,
  } as HrFormState);

  useEffect(() => {
    if (state.success) toast.success(state.message);
    else if (state.message && !state.fieldErrors) toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <input type="hidden" name="employeeId" value={row.employeeId} />
      <input type="hidden" name="year" value={year} />
      <Input
        name="entitlementDays"
        type="number"
        min={0}
        className="h-8 w-16"
        defaultValue={row.entitlementDays}
      />
      <Button type="submit" size="sm" variant="ghost" loading={pending} disabled={pending}>
        ✓
      </Button>
    </form>
  );
}

function MonthCell({ cell }: { cell: MonthCell }) {
  const label = [cell.datesLabel, cell.sickLabel].filter(Boolean).join(' / ');
  return (
    <span title={label}>
      <span className="font-medium">{cell.days || '—'}</span>
      {label ? <span className="text-muted-foreground block text-xs">{label}</span> : null}
    </span>
  );
}

function buildColumns(
  tab: 'regular' | 'occasional',
  year: number
): Array<ColumnDef<LeaveSummaryRow>> {
  const monthColumns: Array<ColumnDef<LeaveSummaryRow>> = MONTH_NAMES.map((label, idx) => {
    const m = idx + 1;
    const key = `month${m}`;
    return {
      key,
      label,
      type: 'number',
      sortable: true,
      align: 'right',
      hideable: true,
      defaultVisible: true,
      render: (_value, row) => <MonthCell cell={row.months[m]!} />,
    };
  });

  return [
    {
      key: 'employeeName',
      label: 'Dolgozó',
      type: 'string',
      sortable: true,
      searchable: true,
      defaultVisible: true,
    },
    {
      key: 'companyName',
      label: 'Cég',
      type: 'string',
      sortable: true,
      filterable: true,
      defaultVisible: true,
    },
    ...(tab === 'occasional'
      ? ([
          {
            key: 'taj',
            label: 'TAJ',
            type: 'string',
            sortable: true,
            defaultVisible: true,
            render: (_v, row) => (
              <span className="font-mono text-xs">{row.personalData?.taj ?? '—'}</span>
            ),
          },
          {
            key: 'taxId',
            label: 'Adóazonosító',
            type: 'string',
            sortable: true,
            defaultVisible: true,
            render: (_v, row) => (
              <span className="font-mono text-xs">{row.personalData?.taxId ?? '—'}</span>
            ),
          },
        ] satisfies Array<ColumnDef<LeaveSummaryRow>>)
      : []),
    {
      key: 'entitlementDays',
      label: 'Éves keret',
      type: 'number',
      sortable: true,
      align: 'right',
      defaultVisible: true,
      render: (_value, row) => <EntitlementCell row={row} year={year} />,
    },
    ...monthColumns,
    {
      key: 'usedHolidayDays',
      label: 'Felhasznált',
      type: 'number',
      sortable: true,
      align: 'right',
      defaultVisible: true,
    },
    {
      key: 'remainingDays',
      label: 'Maradék',
      type: 'number',
      sortable: true,
      align: 'right',
      defaultVisible: true,
    },
  ];
}

export function LeaveSummaryTable({
  rows,
  year,
  tab,
  basePath,
  toolbarLeading,
  toolbarExtra,
}: {
  rows: LeaveSummaryRow[];
  year: number;
  tab: 'regular' | 'occasional';
  basePath: string;
  toolbarLeading?: React.ReactNode;
  toolbarExtra?: React.ReactNode;
}) {
  const columns = useMemo(() => buildColumns(tab, year), [tab, year]);

  const data = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        taj: row.personalData?.taj ?? '',
        taxId: row.personalData?.taxId ?? '',
        ...Object.fromEntries(
          MONTH_NAMES.map((_, idx) => {
            const m = idx + 1;
            return [`month${m}`, row.months[m]?.days ?? 0];
          })
        ),
      })),
    [rows]
  );

  return (
    <DataTable<LeaveSummaryRow>
      mode="client"
      tableId="accounting-leave-summary"
      data={data}
      columns={columns}
      query={defaultQuery}
      total={data.length}
      basePath={basePath}
      getRowKey={(row) => row.employeeId}
      emptyMessage="Nincs megjeleníthető dolgozó."
      variant="compact"
      toolbarLeading={toolbarLeading}
      toolbarExtra={toolbarExtra}
    />
  );
}
