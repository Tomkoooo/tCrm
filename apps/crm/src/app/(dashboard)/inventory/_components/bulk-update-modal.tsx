'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchAutocomplete, type SearchItem } from '@/components/ui/search-autocomplete';
import { cn } from '@/lib/utils';
import { bulkUpdateProductsAction } from '../actions';
import { searchSuppliersAction } from '../search-actions';

const selectClassName = cn(
  'border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs',
  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none'
);

type OperationType = 'assignSupplier' | 'setStock' | 'setActive' | 'assignCategory' | 'setBrand';

const OPERATION_LABELS: Record<OperationType, string> = {
  assignSupplier: 'Beszállító hozzárendelése',
  setStock: 'Készlet mennyiség (egy raktárban)',
  setActive: 'Aktív / inaktív',
  assignCategory: 'CRM kategória beállítása',
  setBrand: 'Márka beállítása',
};

export function BulkUpdateModal({
  open,
  onOpenChange,
  warehouses,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: Array<{ id: string; name: string; key: string }>;
}) {
  const searchParams = useSearchParams();
  const [operationType, setOperationType] = useState<OperationType>('assignSupplier');
  const [supplierKey, setSupplierKey] = useState('');
  const [supplierLabel, setSupplierLabel] = useState('');
  const [stockWarehouseKey, setStockWarehouseKey] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [stockMode, setStockMode] = useState<'set' | 'add'>('set');
  const [isActive, setIsActive] = useState(true);
  const [targetCategorySlug, setTargetCategorySlug] = useState('');
  const [brand, setBrand] = useState('');
  const [missingSupplierOnly, setMissingSupplierOnly] = useState(false);
  const [narrowBrand, setNarrowBrand] = useState('');
  const [narrowCategorySlug, setNarrowCategorySlug] = useState('');
  const [pending, setPending] = useState(false);

  const warehouseOptions = useMemo(
    () => warehouses.map((w) => ({ key: w.key, label: w.name })),
    [warehouses]
  );

  const reset = () => {
    setSupplierKey('');
    setSupplierLabel('');
    setStockWarehouseKey('');
    setStockQuantity('');
    setStockMode('set');
    setIsActive(true);
    setTargetCategorySlug('');
    setBrand('');
    setMissingSupplierOnly(false);
    setNarrowBrand('');
    setNarrowCategorySlug('');
  };

  const canSubmit = (): boolean => {
    switch (operationType) {
      case 'assignSupplier':
        return Boolean(supplierKey);
      case 'setStock':
        return Boolean(stockWarehouseKey) && stockQuantity.trim() !== '';
      case 'setActive':
        return true;
      case 'assignCategory':
        return Boolean(targetCategorySlug.trim());
      case 'setBrand':
        return true;
      default:
        return false;
    }
  };

  const runUpdate = async () => {
    setPending(true);
    try {
      const params: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        params[key] = value;
      });

      const fd = new FormData();
      fd.set('operationType', operationType);
      fd.set('missingSupplierOnly', missingSupplierOnly ? 'true' : 'false');
      fd.set('brandFilter', narrowBrand);
      fd.set('categorySlug', narrowCategorySlug);
      fd.set('searchParamsJson', JSON.stringify(params));

      fd.set('supplierKey', supplierKey);
      fd.set('stockWarehouseKey', stockWarehouseKey);
      fd.set('stockQuantity', stockQuantity);
      fd.set('stockMode', stockMode);
      fd.set('isActive', isActive ? 'true' : 'false');
      fd.set('targetCategorySlug', targetCategorySlug);
      fd.set('brand', brand);

      const result = await bulkUpdateProductsAction(fd);
      if (result.success) {
        toast.success(result.message);
        reset();
        onOpenChange(false);
      } else {
        toast.error(result.message);
      }
    } finally {
      setPending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Bezárás"
        onClick={() => {
          reset();
          onOpenChange(false);
        }}
      />
      <div className="bg-background relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border p-6 shadow-lg">
        <h2 className="text-xl font-bold">Tömeges termék módosítás</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          A táblázat jelenlegi szűrőire vonatkozik (keresés, raktár, oszlopszűrők).
          {searchParams.get('search') ? <> Aktív keresés: „{searchParams.get('search')}”.</> : null}
        </p>

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bulk-operation">Művelet</Label>
            <select
              id="bulk-operation"
              className={selectClassName}
              value={operationType}
              onChange={(e) => setOperationType(e.target.value as OperationType)}
            >
              {(Object.keys(OPERATION_LABELS) as OperationType[]).map((key) => (
                <option key={key} value={key}>
                  {OPERATION_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          {operationType === 'assignSupplier' && (
            <>
              <SearchAutocomplete
                placeholder="Beszállító keresése…"
                emptyMessage="Nincs beszállító"
                onSearch={searchSuppliersAction}
                onSelect={(item: SearchItem) => {
                  setSupplierKey(item.sublabel ?? item.value);
                  setSupplierLabel(item.label);
                }}
              />
              {supplierLabel && (
                <p className="text-muted-foreground text-xs">
                  {supplierLabel} ({supplierKey})
                </p>
              )}
            </>
          )}

          {operationType === 'setStock' && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bulk-stock-wh">Raktár</Label>
                <select
                  id="bulk-stock-wh"
                  className={selectClassName}
                  value={stockWarehouseKey}
                  onChange={(e) => setStockWarehouseKey(e.target.value)}
                >
                  <option value="">— válasszon —</option>
                  {warehouseOptions.map((w) => (
                    <option key={w.key} value={w.key}>
                      {w.label} ({w.key})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bulk-stock-mode">Mód</Label>
                  <select
                    id="bulk-stock-mode"
                    className={selectClassName}
                    value={stockMode}
                    onChange={(e) => setStockMode(e.target.value as 'set' | 'add')}
                  >
                    <option value="set">Beállítás (abszolút)</option>
                    <option value="add">Növelés / csökkentés</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bulk-stock-qty">Mennyiség (db)</Label>
                  <Input
                    id="bulk-stock-qty"
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                A készlet beállítása hozzáadja a terméket az adott raktár katalógusához. Excel:
                warehouse 1. = Kispest, 2. = Erzsébet, 3. = Récsei.
              </p>
            </>
          )}

          {operationType === 'setActive' && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isActive} onCheckedChange={(c) => setIsActive(c === true)} />
              Termékek aktívak legyenek
            </label>
          )}

          {operationType === 'assignCategory' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bulk-target-cat">CRM kategória slug</Label>
              <Input
                id="bulk-target-cat"
                value={targetCategorySlug}
                onChange={(e) => setTargetCategorySlug(e.target.value)}
                placeholder="pl. alutent"
              />
            </div>
          )}

          {operationType === 'setBrand' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bulk-target-brand">Márka</Label>
              <Input
                id="bulk-target-brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Üres = törlés"
              />
            </div>
          )}

          <div className="border-t pt-3">
            <p className="text-sm font-medium">Szűkítés a kijelöléshez (opcionális)</p>
            <p className="text-muted-foreground mb-2 text-xs">
              A táblázat szűrőin felül tovább szűkítheti, kire vonatkozzon a művelet.
            </p>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={missingSupplierOnly}
                  onCheckedChange={(checked) => setMissingSupplierOnly(checked === true)}
                />
                Csak beszállító nélküli termékek
              </label>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bulk-narrow-brand">Márka (szűrő)</Label>
                <Input
                  id="bulk-narrow-brand"
                  value={narrowBrand}
                  onChange={(e) => setNarrowBrand(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bulk-narrow-cat">Kategória slug (szűrő)</Label>
                <Input
                  id="bulk-narrow-cat"
                  value={narrowCategorySlug}
                  onChange={(e) => setNarrowCategorySlug(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <Button type="button" onClick={runUpdate} disabled={pending || !canSubmit()}>
            {pending ? 'Mentés…' : 'Alkalmazás'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
          >
            Mégse
          </Button>
        </div>
      </div>
    </div>
  );
}
