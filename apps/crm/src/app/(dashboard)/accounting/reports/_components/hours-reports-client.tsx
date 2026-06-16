'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { calculateEmployeeGrossPay, payTypeLabel } from '@crm/lib';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveMonthlySummaryAction, suggestMonthlyFromScheduleAction } from '../actions';
import type { HrFormState } from '../../_components/form-utils';
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

  const grouped = useMemo(() => {
    const map = new Map<string, HoursReportRowClient[]>();
    for (const row of rows) {
      const key = row.companyName || '—';
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'hu'));
  }, [rows]);

  const showGrouped = !companyId && grouped.length > 1;

  return (
    <div className="flex flex-col gap-6">
      <KimutatasFilters
        year={year}
        month={month}
        companyId={companyId}
        companies={companies}
        basePath={basePath}
        exportHref={exportHref}
      />

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nincs dolgozó a szűréshez.</p>
      ) : showGrouped ? (
        grouped.map(([companyName, companyRows]) => (
          <section key={companyName} className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold">{companyName}</h3>
            <div className="grid gap-4 lg:grid-cols-2">
              {companyRows.map((row) => (
                <HoursReportCard key={row.employeeId} row={row} year={year} month={month} />
              ))}
            </div>
          </section>
        ))
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((row) => (
            <HoursReportCard key={row.employeeId} row={row} year={year} month={month} />
          ))}
        </div>
      )}
    </div>
  );
}

function HoursReportCard({
  row,
  year,
  month,
}: {
  row: HoursReportRowClient;
  year: number;
  month: number;
}) {
  const [expanded, setExpanded] = useState(!row.hasSavedSummary);
  const [workedHours, setWorkedHours] = useState(String(row.workedHours));
  const [holidayDays, setHolidayDays] = useState(String(row.holidayDays));
  const [sickDays, setSickDays] = useState(String(row.sickDays));
  const [sickPayAmount, setSickPayAmount] = useState(
    row.sickPayAmount != null ? String(row.sickPayAmount) : ''
  );
  const [pending, startSave] = useTransition();
  const [suggestPending, startSuggest] = useTransition();

  const scheduleHint =
    !row.hasSavedSummary ||
    row.scheduleWorkedHours !== Number(workedHours) ||
    row.scheduleHolidayDays !== Number(holidayDays) ||
    row.scheduleSickDays !== Number(sickDays);

  const liveGross = calculateEmployeeGrossPay({
    payType: row.payType,
    monthlySalaryHuf: row.monthlySalaryHuf,
    hourlyRateHuf: row.hourlyRateHuf,
    workedHours: Number(workedHours) || 0,
    sickPayAmount: sickPayAmount ? Number(sickPayAmount) : 0,
  });

  const onSave = () => {
    const fd = new FormData();
    fd.set('employeeId', row.employeeId);
    fd.set('year', String(year));
    fd.set('month', String(month));
    fd.set('workedHours', workedHours);
    fd.set('holidayDays', holidayDays);
    fd.set('sickDays', sickDays);
    if (sickPayAmount) fd.set('sickPayAmount', sickPayAmount);
    startSave(async () => {
      const res = await saveMonthlySummaryAction({ success: false } as HrFormState, fd);
      if (res.success) toast.success(res.message);
      else toast.error(res.message ?? 'Mentés sikertelen.');
    });
  };

  const onSuggest = () => {
    startSuggest(async () => {
      const res = await suggestMonthlyFromScheduleAction(row.employeeId, year, month);
      if ('error' in res) {
        toast.error(res.error);
        return;
      }
      setWorkedHours(String(res.workedHours));
      setHolidayDays(String(res.holidayDays));
      setSickDays(String(res.sickDays));
      setExpanded(true);
      toast.success('Beosztás értékek betöltve — ellenőrizze, majd mentse.');
    });
  };

  return (
    <article className="border-border bg-card flex flex-col rounded-lg border">
      <header className="flex items-start justify-between gap-3 border-b p-4">
        <div className="min-w-0">
          <h4 className="truncate font-semibold">{row.employeeName}</h4>
          <p className="text-muted-foreground text-sm">{row.companyName}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {payTypeLabel(row.payType)}
            {row.payType === 'monthly' && row.monthlySalaryHuf != null
              ? ` · ${formatHuf(row.monthlySalaryHuf)} / hó`
              : null}
            {row.payType === 'hourly' && row.hourlyRateHuf != null
              ? ` · ${formatHuf(row.hourlyRateHuf)} / óra`
              : null}
          </p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground text-xs">Bruttó (becslés)</p>
          <p className="text-lg font-semibold tabular-nums">{formatHuf(liveGross)}</p>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3 p-4 text-sm">
        <Stat label="Éves keret" value={String(row.entitlementDays)} />
        <Stat label="Maradék" value={String(row.remainingDays)} />
        <Stat label="Szabadság (hó)" value={String(row.holidayDays)} hint={row.holidayDatesLabel} />
      </div>

      <div className="border-t px-4 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-between"
          onClick={() => setExpanded((v) => !v)}
        >
          Havi adatok szerkesztése
          <span className="text-muted-foreground text-xs">{expanded ? '▲' : '▼'}</span>
        </Button>
      </div>

      {expanded ? (
        <div className="flex flex-col gap-4 border-t p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Ledolgozott óra">
              <Input
                type="number"
                step="0.01"
                className="h-9"
                value={workedHours}
                onChange={(e) => setWorkedHours(e.target.value)}
              />
              {scheduleHint ? (
                <span className="text-muted-foreground text-xs">
                  Beosztás: {row.scheduleWorkedHours}
                </span>
              ) : null}
            </Field>
            <Field label="Szabadság nap">
              <Input
                type="number"
                className="h-9"
                value={holidayDays}
                onChange={(e) => setHolidayDays(e.target.value)}
              />
            </Field>
            <Field label="Beteg nap">
              <Input
                type="number"
                className="h-9"
                value={sickDays}
                onChange={(e) => setSickDays(e.target.value)}
              />
              {row.sickDatesLabel ? (
                <span className="text-muted-foreground text-xs">{row.sickDatesLabel}</span>
              ) : null}
            </Field>
            <Field label="Táppénz (HUF)">
              <Input
                type="number"
                className="h-9"
                value={sickPayAmount}
                onChange={(e) => setSickPayAmount(e.target.value)}
                placeholder="0"
              />
            </Field>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" loading={pending} disabled={pending} onClick={onSave}>
              Mentés
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              loading={suggestPending}
              disabled={suggestPending}
              onClick={onSuggest}
            >
              Beosztásból
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium tabular-nums">{value}</p>
      {hint ? (
        <p className="text-muted-foreground truncate text-xs" title={hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
