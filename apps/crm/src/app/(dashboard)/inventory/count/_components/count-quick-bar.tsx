'use client';

import { useCallback, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button, Input, Label, SearchAutocomplete, type SearchItem } from '@crm/ui';
import { ProductSkuLabel } from '@/components/product-sku-label';

import { searchCountProductsAction, setWarehouseStockAction } from '../../quick-actions';

type Selected = {
  productId: string;
  sku: string;
  name: string;
  onHand: number;
};

export function CountQuickBar({ warehouseId }: { warehouseId: string }) {
  const router = useRouter();
  const qtyRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [qty, setQty] = useState('');
  const [searchKey, setSearchKey] = useState(0);
  const [pending, startTransition] = useTransition();

  const onSearch = useCallback(
    (query: string) => searchCountProductsAction(query, warehouseId),
    [warehouseId]
  );

  const onSelect = (item: SearchItem) => {
    const raw = item.raw as { sku?: string; onHand?: number } | undefined;
    const sku = raw?.sku ?? item.sublabel?.split(' · ')[0] ?? item.value;
    const onHand = raw?.onHand ?? 0;
    setSelected({ productId: item.value, sku, name: item.label, onHand });
    setQty('');
    requestAnimationFrame(() => qtyRef.current?.focus());
  };

  const save = () => {
    if (!selected) return;
    const next = Number(qty);
    if (!Number.isFinite(next) || next < 0) {
      toast.error('Adj meg egy nem negatív mennyiséget.');
      return;
    }
    const quantity = Math.floor(next);
    startTransition(async () => {
      const result = await setWarehouseStockAction(selected.productId, warehouseId, quantity);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(`${selected.name}: ${result.onHand} db`);
      setSelected(null);
      setQty('');
      setSearchKey((k) => k + 1);
      router.refresh();
    });
  };

  return (
    <div className="bg-card flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-end">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Label>Termék keresése</Label>
        <SearchAutocomplete
          key={searchKey}
          placeholder="Név vagy SKU…"
          onSearch={onSearch}
          onSelect={onSelect}
          selectedLabel={
            selected
              ? `${selected.name}${selected.sku !== selected.name ? ` · ${selected.sku}` : ''}`
              : undefined
          }
        />
      </div>
      <div className="flex w-full flex-col gap-2 md:w-36">
        <Label htmlFor="count-quick-qty">Darabszám</Label>
        <Input
          ref={qtyRef}
          id="count-quick-qty"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          value={qty}
          placeholder={selected ? String(selected.onHand) : '0'}
          disabled={!selected || pending}
          onChange={(e) => setQty(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              save();
            }
          }}
        />
      </div>
      <Button type="button" disabled={!selected || pending} loading={pending} onClick={save}>
        Mentés
      </Button>
      {selected ? (
        <p className="text-muted-foreground text-xs md:hidden">
          Jelenlegi: <ProductSkuLabel sku={selected.sku} name={selected.name} layout="inline" /> ·{' '}
          {selected.onHand} db
        </p>
      ) : null}
    </div>
  );
}
