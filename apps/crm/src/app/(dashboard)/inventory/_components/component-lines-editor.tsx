'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchAutocomplete } from '@/components/ui/search-autocomplete';
import { searchProductsAction } from '../search-actions';

export type ComponentLine = {
  productId: string;
  productSku: string;
  label: string;
  quantity: number;
};

export function ComponentLinesEditor({
  name = 'componentsJson',
  initial = [],
}: {
  name?: string;
  initial?: ComponentLine[];
}) {
  const [lines, setLines] = useState<ComponentLine[]>(initial);

  const addLine = (item: { value: string; label: string; sublabel?: string }) => {
    if (lines.some((l) => l.productId === item.value)) return;
    setLines((prev) => [
      ...prev,
      {
        productId: item.value,
        productSku: item.label,
        label: item.sublabel ? `${item.label} · ${item.sublabel}` : item.label,
        quantity: 1,
      },
    ]);
  };

  const updateQty = (productId: string, quantity: number) => {
    setLines((prev) =>
      prev.map((l) =>
        l.productId === productId ? { ...l, quantity: Math.max(0.000001, quantity) } : l
      )
    );
  };

  const remove = (productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label>Alkatrész hozzáadása (CRM SKU keresés)</Label>
        <SearchAutocomplete
          placeholder="Termék keresése…"
          onSearch={searchProductsAction}
          onSelect={addLine}
        />
      </div>

      {lines.length > 0 && (
        <ul className="flex flex-col gap-2 rounded-md border p-3">
          {lines.map((line) => (
            <li key={line.productId} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 font-mono text-xs">{line.productSku}</span>
              <Input
                type="number"
                min={0.000001}
                step="any"
                className="h-8 w-24"
                value={line.quantity}
                onChange={(e) => updateQty(line.productId, Number(e.target.value))}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(line.productId)}
              >
                Eltávolítás
              </Button>
            </li>
          ))}
        </ul>
      )}

      <input
        type="hidden"
        name={name}
        value={JSON.stringify(lines.map((l) => ({ productId: l.productId, quantity: l.quantity })))}
      />
    </div>
  );
}
