'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type ProductStockLevelRow = {
  warehouseId: string;
  warehouseName: string;
  warehouseKey: string;
  onHand: number;
};

export function ProductStockEditor({ initialLevels }: { initialLevels: ProductStockLevelRow[] }) {
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(initialLevels.map((l) => [l.warehouseId, l.onHand]))
  );

  if (!initialLevels.length) {
    return (
      <p className="text-muted-foreground text-sm">
        Nincs hozzárendelt raktár — csak globális jogosultságú felhasználók módosíthatnak készletet
        raktár nélkül.
      </p>
    );
  }

  const payload = initialLevels.map((l) => ({
    warehouseId: l.warehouseId,
    quantity: quantities[l.warehouseId] ?? 0,
  }));

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        A termék raktár jelenléte a készletszintből származik. Üres készlet = nincs az adott
        raktárban.
      </p>
      <input type="hidden" name="stockLevelsJson" value={JSON.stringify(payload)} />
      <ul className="flex flex-col gap-2 rounded-md border p-3">
        {initialLevels.map((level) => (
          <li key={level.warehouseId} className="grid grid-cols-[1fr_auto_auto] items-center gap-3">
            <div>
              <p className="text-sm font-medium">{level.warehouseName}</p>
              <p className="text-muted-foreground font-mono text-xs">{level.warehouseKey}</p>
            </div>
            <span className="text-muted-foreground whitespace-nowrap text-xs">
              Jelenlegi: {level.onHand}
            </span>
            <div className="flex items-center gap-2">
              <Label htmlFor={`stock-${level.warehouseId}`} className="sr-only">
                Készlet — {level.warehouseName}
              </Label>
              <Input
                id={`stock-${level.warehouseId}`}
                type="number"
                min={0}
                step={1}
                className="h-8 w-24"
                value={quantities[level.warehouseId] ?? 0}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setQuantities((prev) => ({
                    ...prev,
                    [level.warehouseId]: Number.isFinite(next) ? Math.max(0, next) : 0,
                  }));
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
