'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@crm/ui';
import { Input } from '@crm/ui';
import { Label } from '@crm/ui';
import { createReservationAction, type LogisticsFormState } from '../actions';
import { cn } from '@/lib/utils';

type WarehouseOption = { _id: string; name: string; key: string };
type ProductOption = { _id: string; sku: string; name: string };

const selectClassName = cn(
  'border-input bg-background ring-offset-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs',
  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none'
);

const initialState: LogisticsFormState = { success: false };

export function ReservationForm({
  warehouses,
  products,
}: {
  warehouses: WarehouseOption[];
  products: ProductOption[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createReservationAction, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.message && (
        <p className={`text-sm ${state.success ? 'text-green-700' : 'text-red-600'}`} role="status">
          {state.message}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="productId">
            Product <span className="text-red-600">*</span>
          </Label>
          <select id="productId" name="productId" className={selectClassName} required>
            <option value="">Select product</option>
            {products.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} · {p.sku}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="warehouseId">
            Warehouse <span className="text-red-600">*</span>
          </Label>
          <select id="warehouseId" name="warehouseId" className={selectClassName} required>
            <option value="">Select warehouse</option>
            {warehouses.map((w) => (
              <option key={w._id} value={w._id}>
                {w.name} ({w.key})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="quantity">
            Quantity <span className="text-red-600">*</span>
          </Label>
          <Input id="quantity" name="quantity" type="number" min="0.000001" step="any" required />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="sourceRef">Reference</Label>
          <Input id="sourceRef" name="sourceRef" placeholder="Order / build ref" />
        </div>

        <input type="hidden" name="sourceType" value="manual" />

        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="note">Note</Label>
          <Input id="note" name="note" />
        </div>
      </div>

      <Button type="submit" loading={pending} disabled={pending}>
        {pending ? 'Creating…' : 'Create reservation'}
      </Button>
    </form>
  );
}
