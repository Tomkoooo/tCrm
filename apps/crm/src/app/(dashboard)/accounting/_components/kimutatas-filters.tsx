'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function KimutatasFilters({
  year,
  month,
  companyId,
  companies,
  basePath,
  exportHref,
  extra,
}: {
  year: number;
  month: number;
  companyId: string;
  companies: { _id: string; name: string }[];
  basePath: string;
  exportHref?: string;
  extra?: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set(key, value);
    router.push(`${basePath}?${p.toString()}`);
  };

  return (
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
        Hónap
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
      {extra}
      {exportHref ? (
        <Button asChild variant="outline" size="sm">
          <Link href={exportHref}>XLSX export</Link>
        </Button>
      ) : null}
    </div>
  );
}
