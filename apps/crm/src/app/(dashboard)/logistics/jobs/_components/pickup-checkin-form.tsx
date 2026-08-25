'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label, Textarea } from '@crm/ui';
import { pickupCheckInAction, type JobFormState } from '../actions';
import { PickupLineWorkflowRow, type PickupBomComponentView } from './pickup-lines-list';

export type PickupCheckInLine = {
  productId: string;
  sku: string;
  name: string;
  isPrebuild: boolean;
  bomComponents: PickupBomComponentView[];
  requestedQuantity: number;
  warehouseName?: string;
};

const initialState: JobFormState = { success: false };

export function PickupCheckInForm({ jobId, lines }: { jobId: string; lines: PickupCheckInLine[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    (prev: JobFormState, fd: FormData) => pickupCheckInAction(jobId, prev, fd),
    initialState
  );
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(lines.map((l) => [l.productId, String(l.requestedQuantity)]))
  );
  const [note, setNote] = useState('');

  const linesJson = JSON.stringify(
    lines.map((l) => ({
      productId: l.productId,
      gatheredQuantity: Number(values[l.productId]) || 0,
    }))
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
        Ha valamiből mást vagy máshogy vittél, add meg a tényleges darabszámot, és írd le lent, mi
        történt.
      </p>
      <ul className="space-y-3">
        {lines.map((l) => (
          <PickupLineWorkflowRow
            key={l.productId}
            line={{
              productId: l.productId,
              sku: l.sku,
              name: l.name,
              quantity: l.requestedQuantity,
              isPrebuild: l.isPrebuild,
              bomComponents: l.bomComponents,
            }}
          >
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">
                  Összeszedett darab {l.warehouseName ? `(${l.warehouseName})` : ''}
                </Label>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  className="w-28"
                  value={values[l.productId] ?? '0'}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [l.productId]: e.target.value }))
                  }
                />
              </div>
            </div>
          </PickupLineWorkflowRow>
        ))}
      </ul>
      <div className="flex flex-col gap-1">
        <Label htmlFor="pickup-note" className="text-xs">
          Probléma / eltérés leírása (opcionális)
        </Label>
        <Textarea
          id="pickup-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="pl. a 4 m cső helyett 2×2 m + toldó volt fenn"
        />
      </div>
      <Button type="submit" size="sm" loading={pending} disabled={pending}>
        Átvétel rögzítése
      </Button>
    </form>
  );
}
