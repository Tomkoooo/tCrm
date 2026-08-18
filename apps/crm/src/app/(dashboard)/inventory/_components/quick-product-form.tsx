'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import type { CategoryOption } from '@/lib/inventory/category-options';
import { Button, Input, Label } from '@crm/ui';
import { formatProductSkuLine } from '@crm/lib';

import { quickCreateProductAction, type QuickProductFormState } from '../quick-actions';

const initial: QuickProductFormState = { success: false };

const selectClassName = cn(
  'border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs',
  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none'
);

export function QuickProductForm({
  categories,
  warehouses,
  defaultWarehouseId,
  lockWarehouse = false,
  onClose,
}: {
  categories: CategoryOption[];
  warehouses: Array<{ id: string; name: string; key: string }>;
  defaultWarehouseId?: string;
  lockWarehouse?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const [formKey, setFormKey] = useState(0);
  const [state, action, pending] = useActionState(quickCreateProductAction, initial);

  useEffect(() => {
    nameRef.current?.focus();
  }, [formKey]);

  useEffect(() => {
    if (!state.success) return;
    toast.success(`${formatProductSkuLine(state.nameHu, state.sku)} felvéve.`);
    router.refresh();
    if (state.addAnother) {
      setFormKey((k) => k + 1);
      return;
    }
    onClose?.();
  }, [state, router, onClose]);

  const warehouseId = defaultWarehouseId ?? (warehouses.length === 1 ? warehouses[0]?.id : '');

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.success === false && state.message ? (
        <p className="text-destructive text-sm" role="alert">
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="quick-name-hu">
          Név (HU) <span className="text-destructive">*</span>
        </Label>
        <Input
          key={`name-${formKey}`}
          ref={nameRef}
          id="quick-name-hu"
          name="name_hu"
          required
          autoComplete="off"
          placeholder="pl. Sátor 3×6"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="quick-category">
          Kategória <span className="text-destructive">*</span>
        </Label>
        {categories.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nincs kategória.{' '}
            <Link href="/inventory/categories" className="text-primary underline">
              Hozz létre egyet
            </Link>{' '}
            a felvétel előtt.
          </p>
        ) : (
          <select
            key={`cat-${formKey}`}
            id="quick-category"
            name="crm_category_slug"
            required
            className={selectClassName}
            defaultValue=""
          >
            <option value="" disabled>
              Válassz kategóriát…
            </option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {lockWarehouse && warehouseId ? (
        <input type="hidden" name="warehouseId" value={warehouseId} />
      ) : warehouses.length > 0 ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="quick-warehouse">Raktár (opcionális)</Label>
          <select
            key={`wh-${formKey}`}
            id="quick-warehouse"
            name="warehouseId"
            className={selectClassName}
            defaultValue={warehouseId ?? ''}
          >
            <option value="">Nincs készlet most</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {warehouses.length > 0 ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="quick-qty">Mennyiség</Label>
          <Input
            key={`qty-${formKey}`}
            id="quick-qty"
            name="quantity"
            type="number"
            min={0}
            step={1}
            placeholder="0"
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            name="intent"
            value="save"
            loading={pending}
            disabled={pending || categories.length === 0}
          >
            Mentés
          </Button>
          <Button
            type="submit"
            name="intent"
            value="saveAnother"
            variant="secondary"
            loading={pending}
            disabled={pending || categories.length === 0}
          >
            Mentés és újabb
          </Button>
        </div>
        <Button type="button" variant="link" className="h-auto justify-start px-0" asChild>
          <Link href="/inventory/new">Teljes űrlap (SKU, beszállító, árak…)</Link>
        </Button>
      </div>
    </form>
  );
}
