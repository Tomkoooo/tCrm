'use client';

import { useActionState, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createMovementAction, type LogisticsFormState } from '../actions';
import type { MovementType } from '@crm/db';
import { cn } from '@/lib/utils';

type WarehouseOption = { _id: string; name: string; key: string };
type ProductOption = { _id: string; sku: string; name: string };

const selectClassName = cn(
  'border-input bg-background ring-offset-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs',
  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none'
);

const initialState: LogisticsFormState = { success: false };

export function MovementForm({
  type,
  warehouses,
  products,
  title,
}: {
  type: MovementType;
  warehouses: WarehouseOption[];
  products: ProductOption[];
  title: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createMovementAction, initialState);
  const [productId, setProductId] = useState(products[0]?._id ?? '');
  const [quantity, setQuantity] = useState('1');
  const [fromWarehouseId, setFromWarehouseId] = useState(warehouses[0]?._id ?? '');
  const [toWarehouseId, setToWarehouseId] = useState(
    warehouses[1]?._id ?? warehouses[0]?._id ?? ''
  );

  useEffect(() => {
    if (state.success && state.id) {
      router.push(`/logistics/movements/${state.id}`);
    }
  }, [state, router]);

  const linesJson = JSON.stringify([
    {
      productId,
      quantity: Number(quantity) || 1,
    },
  ]);

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="linesJson" value={linesJson} />

      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground text-sm">Creates a draft movement document.</p>
      </div>

      {state.message && !state.success && (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {(type === 'pick' || type === 'transfer') && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="fromWarehouseId">Source warehouse</Label>
            <select
              id="fromWarehouseId"
              name="fromWarehouseId"
              className={selectClassName}
              value={fromWarehouseId}
              onChange={(e) => setFromWarehouseId(e.target.value)}
              required
            >
              {warehouses.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.name} ({w.key})
                </option>
              ))}
            </select>
          </div>
        )}

        {(type === 'grn' || type === 'transfer' || type === 'return') && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="toWarehouseId">Destination warehouse</Label>
            <select
              id="toWarehouseId"
              name="toWarehouseId"
              className={selectClassName}
              value={toWarehouseId}
              onChange={(e) => setToWarehouseId(e.target.value)}
              required
            >
              {warehouses.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.name} ({w.key})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="productId">Product</Label>
          <select
            id="productId"
            className={selectClassName}
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            required
          >
            {products.map((p) => (
              <option key={p._id} value={p._id}>
                {p.sku} — {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="quantity">
            Quantity <span className="text-red-600">*</span>
          </Label>
          <Input
            id="quantity"
            type="number"
            min="0.000001"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="note">Note</Label>
          <Input id="note" name="note" />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Create draft'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
