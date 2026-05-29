'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const selectClassName = cn(
  'border-input bg-background ring-offset-background flex h-9 min-w-[180px] rounded-md border px-3 py-1 text-sm shadow-xs',
  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none'
);

export function WarehouseFilter({
  warehouses,
  selectedId,
}: {
  warehouses: Array<{ id: string; name: string; key: string }>;
  selectedId?: string;
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

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor="warehouse-filter" className="text-xs">
        Raktár
      </Label>
      <select
        id="warehouse-filter"
        className={selectClassName}
        value={selectedId ?? ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Összes (jogosultság szerint)</option>
        {warehouses.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name} ({w.key})
          </option>
        ))}
      </select>
    </div>
  );
}
