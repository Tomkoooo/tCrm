'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useActionState, useEffect, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveMonthlySummaryAction, suggestHoursAction } from '../actions';

export type ReportRow = {
  employeeId: string;
  employeeName: string;
  companyName: string;
  workedHours: number;
  holidayDays: number;
  sickDays: number;
  sickPayAmount?: number;
  notes?: string;
  summaryId?: string;
};

export function ReportsClient({
  year,
  month,
  companyId,
  companies,
  rows,
}: {
  year: number;
  month: number;
  companyId: string;
  companies: { _id: string; name: string }[];
  rows: ReportRow[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set(key, value);
    router.push(`/accounting/reports?${p.toString()}`);
  };

  const exportHref = `/accounting/reports/export?year=${year}&month=${month}${
    companyId ? `&companyId=${companyId}` : ''
  }`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Év
          <Input
            type="number"
            className="w-24"
            defaultValue={year}
            onBlur={(e) => updateParam('year', e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Hónap
          <Input
            type="number"
            min={1}
            max={12}
            className="w-20"
            defaultValue={month}
            onBlur={(e) => updateParam('month', e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Cég
          <select
            className="border-input bg-background h-9 rounded-md border px-2"
            value={companyId}
            onChange={(e) => updateParam('companyId', e.target.value)}
          >
            <option value="">Összes</option>
            {companies.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <Button asChild variant="outline" size="sm">
          <Link href={exportHref}>XLSX export</Link>
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">Dolgozó</th>
              <th className="p-2">Cég</th>
              <th className="p-2">Óra</th>
              <th className="p-2">Szabadság</th>
              <th className="p-2">Beteg</th>
              <th className="p-2">Táppénz</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <ReportRowEditor key={row.employeeId} row={row} year={year} month={month} />
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="text-muted-foreground p-4 text-sm">Nincs adat ehhez az időszakhoz.</p>
        )}
      </div>
    </div>
  );
}

function ReportRowEditor({ row, year, month }: { row: ReportRow; year: number; month: number }) {
  const [state, formAction, pending] = useActionState(saveMonthlySummaryAction, {
    success: false,
  });
  const [suggestPending, startSuggest] = useTransition();

  useEffect(() => {
    if (state.success) toast.success(state.message);
    else if (state.message) toast.error(state.message);
  }, [state]);

  return (
    <tr className="border-b">
      <td className="p-2">{row.employeeName}</td>
      <td className="p-2">{row.companyName}</td>
      <td className="p-2" colSpan={4}>
        <form action={formAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="employeeId" value={row.employeeId} />
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="month" value={month} />
          <Label className="sr-only">Óra</Label>
          <Input
            name="workedHours"
            type="number"
            step="0.01"
            className="h-8 w-20"
            defaultValue={row.workedHours}
          />
          <Input
            name="holidayDays"
            type="number"
            className="h-8 w-16"
            defaultValue={row.holidayDays}
          />
          <Input name="sickDays" type="number" className="h-8 w-16" defaultValue={row.sickDays} />
          <Input
            name="sickPayAmount"
            type="number"
            className="h-8 w-24"
            defaultValue={row.sickPayAmount ?? ''}
            placeholder="HUF"
          />
          <Button type="submit" size="sm" disabled={pending}>
            Mentés
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={suggestPending}
            onClick={() => {
              startSuggest(async () => {
                const res = await suggestHoursAction(row.employeeId, year, month);
                if ('hours' in res) {
                  toast.info(`Javasolt óra: ${res.hours}`);
                } else toast.error(res.error);
              });
            }}
          >
            Számítás
          </Button>
        </form>
      </td>
    </tr>
  );
}
