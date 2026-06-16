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
  companyId?: string;
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

  const missingEntitlement = row.entitlementDays === 0;

  return (
    <div className="flex flex-col gap-1">
      <form
        action={action}
        className="flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
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
      {missingEntitlement ? (
        <span className="text-xs text-amber-600 dark:text-amber-400">Nincs keret</span>
      ) : null}
    </div>
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
  year: number,
  hideCompanyColumn: boolean
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
    ...(hideCompanyColumn
      ? []
      : ([
          {
            key: 'companyName',
            label: 'Cég',
            type: 'string',
            sortable: true,
            filterable: true,
            defaultVisible: true,
          },
        ] satisfies Array<ColumnDef<LeaveSummaryRow>>)),
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

function mapRowsForTable(rows: LeaveSummaryRow[]): LeaveSummaryRow[] {
  return rows.map((row) => ({
    ...row,
    taj: row.personalData?.taj ?? '',
    taxId: row.personalData?.taxId ?? '',
    ...Object.fromEntries(
      MONTH_NAMES.map((_, idx) => {
        const m = idx + 1;
        return [`month${m}`, row.months[m]?.days ?? 0];
      })
    ),
  }));
}

function LeaveSummaryDataTable({
  rows,
  year,
  tab,
  basePath,
  hideCompanyColumn,
  toolbarLeading,
  toolbarExtra,
}: {
  rows: LeaveSummaryRow[];
  year: number;
  tab: 'regular' | 'occasional';
  basePath: string;
  hideCompanyColumn?: boolean;
  toolbarLeading?: React.ReactNode;
  toolbarExtra?: React.ReactNode;
}) {
  const columns = useMemo(
    () => buildColumns(tab, year, hideCompanyColumn ?? false),
    [tab, year, hideCompanyColumn]
  );
  const data = useMemo(() => mapRowsForTable(rows), [rows]);

  return (
    <DataTable<LeaveSummaryRow>
      mode="client"
      tableId={hideCompanyColumn ? 'accounting-leave-summary-group' : 'accounting-leave-summary'}
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

export function LeaveSummaryTable({
  rows,
  year,
  tab,
  basePath,
  companyId,
  toolbarLeading,
  toolbarExtra,
}: {
  rows: LeaveSummaryRow[];
  year: number;
  tab: 'regular' | 'occasional';
  basePath: string;
  companyId?: string;
  toolbarLeading?: React.ReactNode;
  toolbarExtra?: React.ReactNode;
}) {
  const groupedByCompany = useMemo(() => {
    const groups = new Map<string, LeaveSummaryRow[]>();
    for (const row of rows) {
      const key = row.companyName || '—';
      const list = groups.get(key) ?? [];
      list.push(row);
      groups.set(key, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, 'hu'));
  }, [rows]);

  const showGrouped = !companyId && groupedByCompany.length > 1;

  if (!showGrouped) {
    return (
      <LeaveSummaryDataTable
        rows={rows}
        year={year}
        tab={tab}
        basePath={basePath}
        toolbarLeading={toolbarLeading}
        toolbarExtra={toolbarExtra}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {(toolbarLeading || toolbarExtra) && (
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
          {toolbarLeading ? <div className="flex flex-wrap gap-2">{toolbarLeading}</div> : null}
          {toolbarExtra ? (
            <div className="flex flex-wrap items-end gap-3">{toolbarExtra}</div>
          ) : null}
        </div>
      )}
      <div className="flex flex-col gap-8">
        {groupedByCompany.map(([companyName, companyRows], index) => (
          <section key={companyName} className={index > 0 ? 'border-t pt-8' : ''}>
            <h3 className="mb-3 text-lg font-semibold">{companyName}</h3>
            <LeaveSummaryDataTable
              rows={companyRows}
              year={year}
              tab={tab}
              basePath={basePath}
              hideCompanyColumn
            />
          </section>
        ))}
      </div>
    </div>
  );
}
