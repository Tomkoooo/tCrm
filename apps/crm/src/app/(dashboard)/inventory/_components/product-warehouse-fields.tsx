'use client';

import { useState } from 'react';
import { Label } from '@crm/ui';

function StockDrivenWarehouseInfo({
  warehouses,
  initialSelected,
}: {
  warehouses: Array<{ id: string; name: string; key: string }>;
  initialSelected: string[];
}) {
  const labels = initialSelected
    .map((id) => warehouses.find((w) => w.id === id))
    .filter(Boolean)
    .map((w) => `${w!.name} (${w!.key})`);

  return (
    <div className="flex flex-col gap-2 md:col-span-2">
      <Label>Raktárak</Label>
      <input type="hidden" name="warehouseIdsJson" value="[]" />
      <p className="text-muted-foreground text-sm">
        A termék raktár jelenléte a készletszintből származik (import warehouse oszlopok, készlet
        módosítás, logisztikai mozgások). Üres készlet = nincs az adott raktárban.
      </p>
      {labels.length > 0 ? (
        <p className="text-sm">{labels.join(', ')}</p>
      ) : (
        <p className="text-muted-foreground text-sm">Még nincs készlet egyetlen raktárban sem.</p>
      )}
    </div>
  );
}

function ManualWarehouseCheckboxes({
  warehouses,
  initialSelected,
}: {
  warehouses: Array<{ id: string; name: string; key: string }>;
  initialSelected: string[];
}) {
  const [selected, setSelected] = useState<string[]>(initialSelected);

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
      <input type="hidden" name="warehouseIdsJson" value={JSON.stringify(selected)} />
      <div className="flex flex-wrap gap-3">
        {warehouses.map((w) => (
          <label key={w.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4"
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

export function ProductWarehouseFields({
  warehouses,
  initialSelected,
  stockDriven = false,
}: {
  warehouses: Array<{ id: string; name: string; key: string }>;
  initialSelected?: string[];
  stockDriven?: boolean;
}) {
  const selected = initialSelected ?? [];

  if (stockDriven) {
    return <StockDrivenWarehouseInfo warehouses={warehouses} initialSelected={selected} />;
  }

  return <ManualWarehouseCheckboxes warehouses={warehouses} initialSelected={selected} />;
}
