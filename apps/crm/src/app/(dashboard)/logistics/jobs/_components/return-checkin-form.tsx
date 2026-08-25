'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label, Textarea, cn } from '@crm/ui';
import { returnCheckInAction, type JobFormState } from '../actions';
import { PickupLineWorkflowRow, type PickupBomComponentView } from './pickup-lines-list';

export type ReturnCheckInLine = {
  productId: string;
  sku: string;
  name: string;
  isConsumable: boolean;
  isPrebuild: boolean;
  bomComponents: PickupBomComponentView[];
  gatheredQuantity: number;
  warehouseId?: string;
};

const initialState: JobFormState = { success: false };

const selectClassName = cn(
  'border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs',
  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none'
);

export function ReturnCheckInForm({
  jobId,
  lines,
  warehouses,
}: {
  jobId: string;
  lines: ReturnCheckInLine[];
  warehouses: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    (prev: JobFormState, fd: FormData) => returnCheckInAction(jobId, prev, fd),
    initialState
  );
  const [values, setValues] = useState<Record<string, { qty: string; warehouseId: string }>>(() =>
    Object.fromEntries(
      lines.map((l) => [
        l.productId,
        { qty: String(l.gatheredQuantity), warehouseId: l.warehouseId ?? warehouses[0]?.id ?? '' },
      ])
    )
  );
  const [note, setNote] = useState('');

  const linesJson = JSON.stringify(
    lines.map((l) => {
      const v = values[l.productId];
      return {
        productId: l.productId,
        checkedQuantity: Number(v?.qty) || 0,
        returnWarehouseId: v?.warehouseId || undefined,
      };
    })
  );

  if (state.success) router.refresh();

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="linesJson" value={linesJson} />
      <input type="hidden" name="note" value={note} />
      {state.message && (
        <p className={state.success ? 'text-sm text-green-700' : 'text-sm text-red-600'}>
          {state.message}
        </p>
      )}
      <p className="text-muted-foreground text-xs">
        A mennyiség a visszaérkezett darabszám. Ami elveszett vagy nem jött vissza, azt üresen
        (0-ra) hagyva a rendszer hiányként számolja el (tartós termékeknél).
      </p>
      <ul className="space-y-3">
        {lines.map((l) => {
          const v = values[l.productId];
          return (
            <PickupLineWorkflowRow
              key={l.productId}
              line={{
                productId: l.productId,
                sku: l.sku,
                name: l.name,
                quantity: l.gatheredQuantity,
                isPrebuild: l.isPrebuild,
                bomComponents: l.bomComponents,
                isConsumable: l.isConsumable,
              }}
            >
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Visszaérkezett darab</Label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    className="w-28"
                    value={v?.qty ?? '0'}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [l.productId]: { ...prev[l.productId]!, qty: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="flex min-w-40 flex-1 flex-col gap-1">
                  <Label className="text-xs">Cél raktár</Label>
                  <select
                    className={selectClassName}
                    value={v?.warehouseId ?? ''}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [l.productId]: { ...prev[l.productId]!, warehouseId: e.target.value },
                      }))
                    }
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </PickupLineWorkflowRow>
          );
        })}
      </ul>
      <div className="flex flex-col gap-1">
        <Label htmlFor="return-note" className="text-xs">
          Megjegyzés (opcionális)
        </Label>
        <Textarea
          id="return-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />
      </div>
      <Button type="submit" size="sm" loading={pending} disabled={pending}>
        Leadás rögzítése és lezárás
      </Button>
    </form>
  );
}
