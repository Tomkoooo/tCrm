'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

import { cn } from '@/lib/utils';
import { Label } from '@crm/ui';

const selectClassName = cn(
  'border-input bg-background ring-offset-background flex h-9 rounded-md border px-3 py-1 text-sm shadow-xs',
  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none'
);

export function WarehouseFilter({
  warehouses,
  selectedId,
  compact = false,
}: {
  warehouses: Array<{ id: string; name: string; key: string }>;
  selectedId?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (warehouses.length <= 1 && !selectedId) return null;

  const onChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('warehouseId', value);
    else params.delete('warehouseId');
    params.delete('page');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const select = (
    <select
      id="warehouse-filter"
      className={cn(selectClassName, compact ? 'min-w-[10rem]' : 'w-full min-w-[180px]')}
      value={selectedId ?? ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Összes raktár</option>
      {warehouses.map((w) => (
        <option key={w.id} value={w.id}>
          {w.name}
        </option>
      ))}
    </select>
  );

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Label
          htmlFor="warehouse-filter"
          className="text-muted-foreground shrink-0 text-sm font-normal"
        >
          Raktár
        </Label>
        {select}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor="warehouse-filter" className="text-xs">
        Raktár
      </Label>
      {select}
    </div>
  );
}
