'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LeaveSummaryTable, type LeaveSummaryRow } from './leave-summary-table';

export type LeaveSummaryRowClient = LeaveSummaryRow;

export function LeaveSummaryClient({
  year,
  month,
  companyId,
  tab,
  companies,
  rows,
  basePath = '/accounting/leave-summary',
}: {
  year: number;
  month: number;
  companyId: string;
  tab: 'regular' | 'occasional';
  companies: { _id: string; name: string }[];
  rows: LeaveSummaryRowClient[];
  basePath?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set(key, value);
    router.push(`${basePath}?${p.toString()}`);
  };

  const exportYearHref = `/accounting/leave-summary/export?year=${year}&tab=${tab}${
    companyId ? `&companyId=${companyId}` : ''
  }`;
  const exportMonthHref = `/accounting/leave-summary/export?year=${year}&month=${month}&tab=${tab}${
    companyId ? `&companyId=${companyId}` : ''
  }`;

  return (
    <LeaveSummaryTable
      rows={rows}
      year={year}
      tab={tab}
      basePath={basePath}
      toolbarLeading={
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={tab === 'regular' ? 'default' : 'outline'}
            onClick={() => updateParam('tab', 'regular')}
          >
            Állandó dolgozók
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === 'occasional' ? 'default' : 'outline'}
            onClick={() => updateParam('tab', 'occasional')}
          >
            Alkalmi munkavállalók
          </Button>
        </div>
      }
      toolbarExtra={
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Év
            <Input
              type="number"
              className="h-9 w-24"
              defaultValue={year}
              onBlur={(e) => updateParam('year', e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Export hónap
            <Input
              type="number"
              min={1}
              max={12}
              className="h-9 w-20"
              defaultValue={month}
              onBlur={(e) => updateParam('month', e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Cég
            <select
              className="border-input bg-background h-9 rounded-md border px-2 text-sm"
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
            <Link href={exportMonthHref}>Export hónap (XLSX)</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={exportYearHref}>Export év (XLSX)</Link>
          </Button>
        </div>
      }
    />
  );
}
