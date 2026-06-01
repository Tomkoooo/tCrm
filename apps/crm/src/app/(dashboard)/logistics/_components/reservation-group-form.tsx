'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchAutocomplete, type SearchItem } from '@/components/ui/search-autocomplete';
import { searchProductsAction } from '../../inventory/search-actions';
import {
  createReservationsBatchAction,
  loadReferenceLinesAction,
  type LogisticsFormState,
} from '../actions';
import { cn } from '@/lib/utils';

type WarehouseOption = { _id: string; name: string; key: string };

type LineDraft = {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
};

const selectClassName = cn(
  'border-input bg-background ring-offset-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs',
  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none'
);

export function ReservationGroupForm({
  warehouses,
  onSuccess,
}: {
  warehouses: WarehouseOption[];
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?._id ?? '');
  const [sourceType, setSourceType] = useState<'manual' | 'order' | 'build'>('manual');
  const [sourceRef, setSourceRef] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [pending, setPending] = useState(false);

  const addLine = (item: SearchItem, qty = 1) => {
    if (lines.some((l) => l.productId === item.value)) {
      toast.error('A termék már szerepel a listában.');
      return;
    }
    const raw = item.raw as { sku?: string; names?: { hu?: string; en?: string } } | undefined;
    setLines((prev) => [
      ...prev,
      {
        productId: item.value,
        sku: raw?.sku ?? item.label,
        name: item.sublabel ?? item.label,
        quantity: qty,
      },
    ]);
  };

  const loadFromReference = async () => {
    if (!sourceRef.trim()) {
      toast.error('Adja meg a hivatkozást (pl. OFFER-2026-00001).');
      return;
    }
    setPending(true);
    try {
      const result = await loadReferenceLinesAction(sourceRef.trim());
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setLines(
        result.lines.map((l) => ({
          productId: l.productId,
          sku: l.sku,
          name: l.name,
          quantity: l.quantity,
        }))
      );
      toast.success(`${result.lines.length} tétel betöltve.`);
    } finally {
      setPending(false);
    }
  };

  const submit = async () => {
    if (!warehouseId || !sourceRef.trim() || lines.length === 0) {
      toast.error('Raktár, hivatkozás és legalább egy tétel kötelező.');
      return;
    }
    setPending(true);
    try {
      const fd = new FormData();
      fd.set('warehouseId', warehouseId);
      fd.set('sourceType', sourceType);
      fd.set('sourceRef', sourceRef.trim());
      fd.set('note', note);
      fd.set(
        'linesJson',
        JSON.stringify(lines.map((l) => ({ productId: l.productId, quantity: l.quantity })))
      );
      const result: LogisticsFormState = await createReservationsBatchAction(
        { success: false, message: '' },
        fd
      );
      if (result.success) {
        toast.success(result.message);
        setLines([]);
        setSourceRef('');
        router.refresh();
        onSuccess?.();
      } else {
        toast.error(result.message ?? 'Hiba');
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="warehouseId">Raktár</Label>
          <select
            id="warehouseId"
            className={selectClassName}
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
          >
            {warehouses.map((w) => (
              <option key={w._id} value={w._id}>
                {w.name} ({w.key})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="sourceType">Forrás típusa</Label>
          <select
            id="sourceType"
            className={selectClassName}
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as typeof sourceType)}
          >
            <option value="manual">Kézi</option>
            <option value="order">Megrendelés</option>
            <option value="build">Összeszerelés</option>
          </select>
        </div>
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="sourceRef">Hivatkozás</Label>
          <div className="flex gap-2">
            <Input
              id="sourceRef"
              value={sourceRef}
              onChange={(e) => setSourceRef(e.target.value)}
              placeholder="pl. OFFER-2026-00001"
            />
            <Button
              type="button"
              variant="outline"
              onClick={loadFromReference}
              loading={pending}
              disabled={pending}
            >
              Betöltés
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Termék hozzáadása (SKU vagy név)</Label>
        <SearchAutocomplete
          placeholder="Keresés SKU vagy név alapján…"
          onSearch={searchProductsAction}
          onSelect={(item) => addLine(item)}
        />
      </div>

      {lines.length > 0 && (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-2 text-left">SKU</th>
                <th className="px-3 py-2 text-left">Név</th>
                <th className="px-3 py-2 text-right">Menny.</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={line.productId} className="border-b last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{line.sku}</td>
                  <td className="px-3 py-2">{line.name}</td>
                  <td className="px-3 py-2 text-right">
                    <Input
                      type="number"
                      min="0.000001"
                      step="any"
                      className="ml-auto w-24"
                      value={line.quantity}
                      onChange={(e) => {
                        const qty = Number(e.target.value) || 1;
                        setLines((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, quantity: qty } : l))
                        );
                      }}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      Törlés
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="note">Megjegyzés</Label>
        <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <Button type="button" onClick={submit} loading={pending} disabled={pending}>
        {pending ? 'Mentés…' : 'Foglalások létrehozása'}
      </Button>
    </div>
  );
}
