'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { ProductSkuLabel } from '@/components/product-sku-label';
import { STOCK_ADJUSTMENT_REASON_LABELS } from '@/lib/inventory/adjustment-labels';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@crm/ui';

import {
  getProductStockEditorAction,
  revertStockAdjustmentAction,
  saveProductStockLevelsAction,
  type ProductStockEditorData,
} from '../quick-actions';

export function StockCountButton({
  sku,
  name,
  summary,
  canWrite,
}: {
  sku: string;
  name: string;
  summary?: string;
  canWrite: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="hover:text-primary text-left text-sm underline-offset-4 hover:underline"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {summary || '0'}
      </button>
      <StockCountDialog
        sku={sku}
        name={name}
        canWrite={canWrite}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

function StockCountDialog({
  sku,
  name,
  canWrite,
  open,
  onOpenChange,
}: {
  sku: string;
  name: string;
  canWrite: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [data, setData] = useState<ProductStockEditorData | null>(null);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  const load = async () => {
    setLoading(true);
    try {
      const next = await getProductStockEditorAction(sku);
      setData(next);
      if (next) {
        setQuantities(
          Object.fromEntries(next.levels.map((l) => [l.warehouseId, String(l.onHand)]))
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void load();
  }, [open, sku]);

  const save = () => {
    if (!data) return;
    const levels = data.levels.map((l) => ({
      warehouseId: l.warehouseId,
      quantity: Math.max(0, Math.floor(Number(quantities[l.warehouseId]) || 0)),
    }));
    startTransition(async () => {
      const result = await saveProductStockLevelsAction(sku, levels);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      await load();
    });
  };

  const revert = (id: string) => {
    startTransition(async () => {
      const result = await revertStockAdjustmentAction(id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      await load();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-lg"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>Készlet</DialogTitle>
          <DialogDescription>
            <ProductSkuLabel sku={sku} name={name} layout="inline" /> — abszolút darabszám
            raktáranként. Minden mentés naplózódik.
          </DialogDescription>
        </DialogHeader>

        {loading && !data ? (
          <p className="text-muted-foreground text-sm">Betöltés…</p>
        ) : !data ? (
          <p className="text-muted-foreground text-sm">A termék nem található.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {data.levels.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nincs elérhető raktár.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {data.levels.map((level) => (
                  <li key={level.warehouseId} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{level.warehouseName}</p>
                      <p className="text-muted-foreground font-mono text-xs">
                        {level.warehouseKey}
                      </p>
                    </div>
                    {canWrite ? (
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`stock-modal-${level.warehouseId}`} className="sr-only">
                          {level.warehouseName}
                        </Label>
                        <Input
                          id={`stock-modal-${level.warehouseId}`}
                          type="number"
                          min={0}
                          step={1}
                          inputMode="numeric"
                          className="h-8 w-24 text-right"
                          value={quantities[level.warehouseId] ?? '0'}
                          disabled={pending}
                          onChange={(e) =>
                            setQuantities((prev) => ({
                              ...prev,
                              [level.warehouseId]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    ) : (
                      <span className="text-sm tabular-nums">{level.onHand}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {canWrite && data.levels.length > 0 ? (
              <Button type="button" size="sm" loading={pending} disabled={pending} onClick={save}>
                Készlet mentése
              </Button>
            ) : null}

            <div>
              <p className="mb-2 text-sm font-medium">Napló</p>
              {data.adjustments.length === 0 ? (
                <p className="text-muted-foreground text-sm">Még nincs módosítás.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {data.adjustments.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-start justify-between gap-2 rounded-md border px-3 py-2 text-xs"
                    >
                      <div>
                        <p>
                          <span className="font-medium">{row.warehouseName}</span>{' '}
                          <span
                            className={row.delta >= 0 ? 'text-emerald-700' : 'text-destructive'}
                          >
                            {row.delta > 0 ? `+${row.delta}` : row.delta}
                          </span>
                        </p>
                        <p className="text-muted-foreground">
                          {new Date(row.at).toLocaleString('hu-HU')} ·{' '}
                          {STOCK_ADJUSTMENT_REASON_LABELS[
                            row.reason as keyof typeof STOCK_ADJUSTMENT_REASON_LABELS
                          ] ?? row.reason}
                          {row.note ? ` · ${row.note}` : ''}
                          {row.byUserName ? ` · ${row.byUserName}` : ''}
                        </p>
                      </div>
                      {canWrite && row.delta !== 0 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          disabled={pending}
                          onClick={() => revert(row.id)}
                        >
                          Visszavonás
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
