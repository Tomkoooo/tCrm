'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function ProductWarehouseFields({
  warehouses,
  initialSelected,
}: {
  warehouses: Array<{ id: string; name: string; key: string }>;
  initialSelected?: string[];
}) {
  const [selected, setSelected] = useState<string[]>(initialSelected ?? []);

  if (!warehouses.length) {
    return (
      <p className="text-muted-foreground text-sm md:col-span-2">
        Nincs hozzárendelt raktár — csak globális jogosultságú felhasználók hozhatnak létre terméket
        raktár nélkül.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 md:col-span-2">
      <Label>Raktár(ok)</Label>
      <p className="text-muted-foreground text-xs">
        A termék csak a kiválasztott raktár(ok) munkatársai számára jelenik meg (import:
        crm_warehouse_slug).
      </p>
      <input type="hidden" name="warehouseIdsJson" value={JSON.stringify(selected)} />
      <div className="flex flex-wrap gap-3">
        {warehouses.map((w) => (
          <label key={w.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className={cn('size-4')}
              checked={selected.includes(w.id)}
              onChange={(e) => {
                setSelected((prev) =>
                  e.target.checked ? [...prev, w.id] : prev.filter((id) => id !== w.id)
                );
              }}
            />
            {w.name} ({w.key})
          </label>
        ))}
      </div>
    </div>
  );
}
