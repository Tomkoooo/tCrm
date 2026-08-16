'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { cn } from '@/lib/utils';
import { Button, Label } from '@crm/ui';

const selectClassName = cn(
  'border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs',
  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none'
);

export type ExportProductScope = 'filtered' | 'selection' | 'all';
export type ExportAvailability = 'active' | 'all';
export type ExportStockScope = 'current' | 'all_scoped' | 'none';

export function ExportModal({
  open,
  onOpenChange,
  selectedSkus,
  filteredTotal,
  canViewAllProducts,
  showAllProducts,
  warehouseId,
  warehouses,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSkus: string[];
  filteredTotal: number;
  canViewAllProducts: boolean;
  showAllProducts: boolean;
  warehouseId?: string;
  warehouses: Array<{ id: string; name: string; key: string }>;
}) {
  const searchParams = useSearchParams();
  const hasSelection = selectedSkus.length > 0;
  const hasFilters = useMemo(() => {
    const keys = ['search', 'sort', 'warehouseId', 'showAll'];
    if (keys.some((k) => searchParams.has(k))) return true;
    for (const key of searchParams.keys()) {
      if (key.startsWith('f.')) return true;
    }
    return false;
  }, [searchParams]);

  const defaultProductScope: ExportProductScope = hasSelection
    ? 'selection'
    : hasFilters || filteredTotal > 0
      ? 'filtered'
      : 'all';

  const [productScope, setProductScope] = useState<ExportProductScope>(defaultProductScope);
  const [availability, setAvailability] = useState<ExportAvailability>(
    showAllProducts ? 'all' : 'active'
  );
  const [stockScope, setStockScope] = useState<ExportStockScope>(
    warehouseId ? 'current' : 'all_scoped'
  );

  const currentWarehouseLabel = warehouses.find((w) => w.id === warehouseId)?.name;

  const buildExportUrl = () => {
    const params = new URLSearchParams();
    params.set('productScope', productScope);
    params.set('availability', availability);
    params.set('stockScope', stockScope);

    if (productScope === 'selection') {
      params.set('skus', selectedSkus.join(','));
    } else if (productScope === 'filtered') {
      searchParams.forEach((value, key) => {
        params.set(key, value);
      });
      if (availability === 'all' && canViewAllProducts) {
        params.set('showAll', 'true');
      } else if (availability === 'active') {
        params.delete('showAll');
      }
    }

    if (stockScope === 'current' && warehouseId) {
      params.set('warehouseId', warehouseId);
    }

    return `/inventory/export?${params.toString()}`;
  };

  const handleExport = () => {
    window.location.href = buildExportUrl();
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Bezárás"
        onClick={() => onOpenChange(false)}
      />
      <div className="bg-background relative z-10 w-full max-w-lg rounded-lg border p-6 shadow-lg">
        <h2 className="text-xl font-bold">Excel export</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Alapértelmezett Excel formátum, készletszintekkel és CRM mezőkkel.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">Termékek</legend>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name="productScope"
                className="mt-1"
                checked={productScope === 'filtered'}
                onChange={() => setProductScope('filtered')}
              />
              <span>
                Jelenlegi lista szűrő
                <span className="text-muted-foreground block text-xs">
                  Keresés, oszlopszűrők, raktár — kb. {filteredTotal} tétel
                </span>
              </span>
            </label>
            <label
              className={cn(
                'flex items-start gap-2 text-sm',
                !hasSelection && 'text-muted-foreground'
              )}
            >
              <input
                type="radio"
                name="productScope"
                className="mt-1"
                checked={productScope === 'selection'}
                disabled={!hasSelection}
                onChange={() => setProductScope('selection')}
              />
              <span>
                Csak kijelöltek ({selectedSkus.length})
                {!hasSelection && (
                  <span className="block text-xs">Jelöljön ki sorokat a táblázatban.</span>
                )}
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name="productScope"
                className="mt-1"
                checked={productScope === 'all'}
                onChange={() => setProductScope('all')}
              />
              <span>
                Teljes készlet (jogosultság szerint)
                <span className="text-muted-foreground block text-xs">
                  Minden elérhető termék, lista szűrők nélkül
                </span>
              </span>
            </label>
          </fieldset>

          {canViewAllProducts && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="export-availability">Elérhetőség</Label>
              <select
                id="export-availability"
                className={selectClassName}
                value={availability}
                onChange={(e) => setAvailability(e.target.value as ExportAvailability)}
              >
                <option value="active">Csak aktív termékek</option>
                <option value="all">Aktív és inaktív is</option>
              </select>
            </div>
          )}

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">Készlet oszlopok (warehouse 1–3)</legend>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name="stockScope"
                className="mt-1"
                checked={stockScope === 'all_scoped'}
                onChange={() => setStockScope('all_scoped')}
              />
              <span>
                Összes elérhető raktár
                <span className="text-muted-foreground block text-xs">
                  Kispest, Erzsébet, Récsei — ahol van készletadat
                </span>
              </span>
            </label>
            <label
              className={cn(
                'flex items-start gap-2 text-sm',
                !warehouseId && 'text-muted-foreground'
              )}
            >
              <input
                type="radio"
                name="stockScope"
                className="mt-1"
                checked={stockScope === 'current'}
                disabled={!warehouseId}
                onChange={() => setStockScope('current')}
              />
              <span>
                Csak a lista raktár szűrője
                {warehouseId ? (
                  <span className="text-muted-foreground block text-xs">
                    {currentWarehouseLabel ?? warehouseId}
                  </span>
                ) : (
                  <span className="block text-xs">Nincs raktár szűrő a listán.</span>
                )}
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name="stockScope"
                className="mt-1"
                checked={stockScope === 'none'}
                onChange={() => setStockScope('none')}
              />
              <span>Ne exportáljon készletszintet</span>
            </label>
          </fieldset>
        </div>

        <div className="mt-6 flex gap-2">
          <Button type="button" onClick={handleExport}>
            Letöltés
          </Button>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Mégse
          </Button>
        </div>
      </div>
    </div>
  );
}
