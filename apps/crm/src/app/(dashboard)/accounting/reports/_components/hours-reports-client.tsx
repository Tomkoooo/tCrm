'use client';

import { useActionState, useEffect, useTransition } from 'react';
import { toast } from 'sonner';
import { payTypeLabel } from '@crm/lib';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveMonthlySummaryAction, suggestMonthlyFromScheduleAction } from '../actions';
import type { HrFormState } from '../../_components/form-utils';
import {
  KimutatasTable,
  KimutatasTableBody,
  KimutatasTableHead,
  KimutatasTableRow,
  KimutatasTableTd,
  KimutatasTableTh,
  KimutatasEmptyRow,
} from '../../_components/kimutatas-table';
import { KimutatasFilters } from '../../_components/kimutatas-filters';

export type HoursReportRowClient = {
  employeeId: string;
  employeeName: string;
  companyName: string;
  entitlementDays: number;
  usedHolidayDaysYtd: number;
  remainingDays: number;
  payType?: 'monthly' | 'hourly' | null;
  monthlySalaryHuf?: number;
  hourlyRateHuf?: number;
  workedHours: number;
  holidayDays: number;
  sickDays: number;
  sickPayAmount?: number;
  notes?: string;
  scheduleWorkedHours: number;
  scheduleHolidayDays: number;
  scheduleSickDays: number;
  holidayDatesLabel: string;
  sickDatesLabel: string;
  grossPayHuf: number | null;
  hasSavedSummary: boolean;
};

function formatHuf(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('hu-HU').format(value);
}

export function HoursReportsClient({
  year,
  month,
  companyId,
  companies,
  rows,
  basePath = '/accounting/reports',
}: {
  year: number;
  month: number;
  companyId: string;
  companies: { _id: string; name: string }[];
  rows: HoursReportRowClient[];
  basePath?: string;
}) {
  const exportHref = `/accounting/reports/export?year=${year}&month=${month}${
    companyId ? `&companyId=${companyId}` : ''
  }`;

  return (
    <div className="flex flex-col gap-4">
      <KimutatasFilters
        year={year}
        month={month}
        companyId={companyId}
        companies={companies}
        basePath={basePath}
        exportHref={exportHref}
      />

      <KimutatasTable minWidth="1200px">
        <KimutatasTableHead>
          <KimutatasTableTh>Dolgozó</KimutatasTableTh>
          <KimutatasTableTh>Cég</KimutatasTableTh>
          <KimutatasTableTh>Éves keret</KimutatasTableTh>
          <KimutatasTableTh>Maradék</KimutatasTableTh>
          <KimutatasTableTh>Bér típus</KimutatasTableTh>
          <KimutatasTableTh>Szabadság (hó)</KimutatasTableTh>
          <KimutatasTableTh>Havi adatok</KimutatasTableTh>
          <KimutatasTableTh>Bruttó (HUF)</KimutatasTableTh>
        </KimutatasTableHead>
        <KimutatasTableBody>
          {rows.map((row) => (
            <HoursReportRowEditor key={row.employeeId} row={row} year={year} month={month} />
          ))}
          {rows.length === 0 && (
            <KimutatasEmptyRow colSpan={8} message="Nincs dolgozó a szűréshez." />
          )}
        </KimutatasTableBody>
      </KimutatasTable>
    </div>
  );
}

function HoursReportRowEditor({
  row,
  year,
  month,
}: {
  row: HoursReportRowClient;
  year: number;
  month: number;
}) {
  const [state, formAction, pending] = useActionState(saveMonthlySummaryAction, {
    success: false,
  } as HrFormState);
  const [suggestPending, startSuggest] = useTransition();

  useEffect(() => {
    if (state.success) toast.success(state.message);
    else if (state.message) toast.error(state.message);
  }, [state]);

  const scheduleHint =
    !row.hasSavedSummary ||
    row.scheduleWorkedHours !== row.workedHours ||
    row.scheduleHolidayDays !== row.holidayDays ||
    row.scheduleSickDays !== row.sickDays;

  return (
    <KimutatasTableRow>
      <KimutatasTableTd className="font-medium">{row.employeeName}</KimutatasTableTd>
      <KimutatasTableTd>{row.companyName}</KimutatasTableTd>
      <KimutatasTableTd>{row.entitlementDays}</KimutatasTableTd>
      <KimutatasTableTd>{row.remainingDays}</KimutatasTableTd>
      <KimutatasTableTd>
        <span className="block">{payTypeLabel(row.payType)}</span>
        {row.payType === 'monthly' && row.monthlySalaryHuf != null ? (
          <span className="text-muted-foreground text-xs">
            {formatHuf(row.monthlySalaryHuf)} / hó
          </span>
        ) : null}
        {row.payType === 'hourly' && row.hourlyRateHuf != null ? (
          <span className="text-muted-foreground text-xs">
            {formatHuf(row.hourlyRateHuf)} / óra
          </span>
        ) : null}
      </KimutatasTableTd>
      <KimutatasTableTd title={row.holidayDatesLabel}>
        <span className="font-medium">{row.holidayDays || '—'}</span>
        {row.holidayDatesLabel ? (
          <span className="text-muted-foreground block text-xs">{row.holidayDatesLabel}</span>
        ) : null}
        {scheduleHint && row.scheduleHolidayDays !== row.holidayDays ? (
          <span className="text-muted-foreground block text-xs">
            Beosztás: {row.scheduleHolidayDays}
          </span>
        ) : null}
      </KimutatasTableTd>
      <KimutatasTableTd colSpan={1}>
        <form action={formAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="employeeId" value={row.employeeId} />
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="month" value={month} />
          <div className="space-y-1">
            <Label className="text-xs">Óra</Label>
            <Input
              name="workedHours"
              type="number"
              step="0.01"
              className="h-8 w-24"
              defaultValue={row.workedHours}
            />
            {scheduleHint ? (
              <span className="text-muted-foreground text-xs">
                Beosztás: {row.scheduleWorkedHours}
              </span>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Szabadság nap</Label>
            <Input
              name="holidayDays"
              type="number"
              className="h-8 w-20"
              defaultValue={row.holidayDays}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Beteg nap</Label>
            <Input name="sickDays" type="number" className="h-8 w-20" defaultValue={row.sickDays} />
            {row.sickDatesLabel ? (
              <span className="text-muted-foreground text-xs">{row.sickDatesLabel}</span>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Táppénz</Label>
            <Input
              name="sickPayAmount"
              type="number"
              className="h-8 w-28"
              defaultValue={row.sickPayAmount ?? ''}
              placeholder="HUF"
            />
          </div>
          <Button type="submit" size="sm" loading={pending} disabled={pending}>
            Mentés
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            loading={suggestPending}
            disabled={suggestPending}
            onClick={() => {
              startSuggest(async () => {
                const res = await suggestMonthlyFromScheduleAction(row.employeeId, year, month);
                if ('workedHours' in res) {
                  toast.info(
                    `Beosztás: ${res.workedHours} óra, ${res.holidayDays} szabadság, ${res.sickDays} betegnap`
                  );
                } else toast.error(res.error);
              });
            }}
          >
            Beosztásból
          </Button>
        </form>
      </KimutatasTableTd>
      <KimutatasTableTd className="whitespace-nowrap font-medium">
        {formatHuf(row.grossPayHuf)}
      </KimutatasTableTd>
    </KimutatasTableRow>
  );
}
