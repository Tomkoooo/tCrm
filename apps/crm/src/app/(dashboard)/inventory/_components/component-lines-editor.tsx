'use client';

import { useState } from 'react';

import { productDisplayName } from '@crm/lib';
import { searchProductsAction } from '../search-actions';
import { Button, Input, Label, SearchAutocomplete } from '@crm/ui';

export type ComponentLine = {
  productId: string;
  productSku: string;
  /** Display name (HU/EN); falls back to SKU in the list */
  productName?: string;
  quantity: number;
};

function lineFromSearchItem(item: {
  value: string;
  label: string;
  sublabel?: string;
  raw?: unknown;
}) {
  const raw = item.raw as
    | { sku?: string; names?: { hu?: string; en?: string; de?: string } }
    | undefined;
  const productSku = raw?.sku ?? item.sublabel ?? item.label;
  const displayName = productDisplayName(raw?.names, productSku);
  return {
    productId: item.value,
    productSku,
    productName: displayName !== productSku ? displayName : undefined,
    quantity: 1,
  };
}

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
    setLines((prev) => [...prev, lineFromSearchItem(item)]);
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
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {line.productName ?? line.productSku}
                </p>
                {line.productName ? (
                  <p className="text-muted-foreground truncate font-mono text-xs">
                    {line.productSku}
                  </p>
                ) : null}
              </div>
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
