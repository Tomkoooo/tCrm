'use client';

import { useActionState, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label, SearchAutocomplete, cn, type SearchItem } from '@crm/ui';

import { checkInPickupAction, searchHandoffJobsAction, type JobFormState } from '../actions';
import {
  PickupLineWorkflowRow,
  type PickupBomComponentView,
  type PickupLineListItem,
} from './pickup-lines-list';

type CheckInLine = {
  productId: string;
  sku: string;
  name: string;
  isPrebuild: boolean;
  bomComponents: PickupBomComponentView[];
  requestedQuantity: number;
  gatheredQuantity: number;
};

const initialState: JobFormState = { success: false };

const selectClassName = cn(
  'border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs',
  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none'
);

type LineDest = {
  qty: string;
  kind: 'warehouse' | 'job';
  warehouseId: string;
  jobId: string;
  jobLabel: string;
};

export function CheckInLineForm({
  jobId,
  pickupId,
  originWarehouseId,
  warehouses,
  lines,
}: {
  jobId: string;
  pickupId: string;
  originWarehouseId: string;
  warehouses: Array<{ id: string; name: string }>;
  lines: CheckInLine[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    (prev: JobFormState, fd: FormData) => checkInPickupAction(jobId, prev, fd),
    initialState
  );
  const [values, setValues] = useState<Record<string, LineDest>>(() =>
    Object.fromEntries(
      lines.map((l) => [
        l.productId,
        {
          qty: String(l.gatheredQuantity || l.requestedQuantity || 0),
          kind: 'warehouse' as const,
          warehouseId: originWarehouseId,
          jobId: '',
          jobLabel: '',
        },
      ])
    )
  );

  const onSearchJobs = useCallback(
    (query: string) => searchHandoffJobsAction(query, jobId),
    [jobId]
  );

  const linesJson = JSON.stringify(
    lines.map((l) => {
      const v = values[l.productId];
      return {
        productId: l.productId,
        checkedQuantity: Number(v?.qty) || 0,
        destinationKind: v?.kind ?? 'warehouse',
        warehouseId: v?.kind === 'warehouse' ? v.warehouseId : undefined,
        jobId: v?.kind === 'job' ? v.jobId : undefined,
      };
    })
  );

  if (state.success) router.refresh();

  const toListItem = (line: CheckInLine): PickupLineListItem => ({
    productId: line.productId,
    sku: line.sku,
    name: line.name,
    quantity: line.requestedQuantity,
    isPrebuild: line.isPrebuild,
    bomComponents: line.bomComponents,
  });

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="pickupId" value={pickupId} />
      <input type="hidden" name="linesJson" value={linesJson} />
      {state.message && (
        <p className={state.success ? 'text-sm text-green-700' : 'text-sm text-red-600'}>
          {state.message}
        </p>
      )}
      <p className="text-muted-foreground text-xs">
        A mennyiség a visszaérkezett darabszám. Cél lehet a kiindulási raktártól eltérő raktár, vagy
        a következő esemény — akkor a készlet nem megy raktárba, hanem a másik szállításra kerül.
      </p>
      <ul className="space-y-3">
        {lines.map((l) => {
          const v = values[l.productId];
          return (
            <PickupLineWorkflowRow key={l.productId} line={toListItem(l)}>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Darab</Label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      className="w-24"
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
                    <Label className="text-xs">Cél</Label>
                    <select
                      className={selectClassName}
                      value={v?.kind ?? 'warehouse'}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          [l.productId]: {
                            ...prev[l.productId]!,
                            kind: e.target.value as 'warehouse' | 'job',
                          },
                        }))
                      }
                    >
                      <option value="warehouse">Raktár</option>
                      <option value="job">Következő esemény</option>
                    </select>
                  </div>
                </div>
                {v?.kind === 'job' ? (
                  <SearchAutocomplete
                    placeholder="Esemény keresése…"
                    onSearch={onSearchJobs}
                    selectedLabel={v.jobLabel || undefined}
                    onSelect={(item: SearchItem) =>
                      setValues((prev) => ({
                        ...prev,
                        [l.productId]: {
                          ...prev[l.productId]!,
                          jobId: item.value,
                          jobLabel: item.sublabel ? `${item.label} · ${item.sublabel}` : item.label,
                        },
                      }))
                    }
                  />
                ) : (
                  <select
                    className={selectClassName}
                    value={v?.warehouseId ?? originWarehouseId}
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
                        {w.id === originWarehouseId ? ' (kiindulás)' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </PickupLineWorkflowRow>
          );
        })}
      </ul>
      <Button type="submit" size="sm" loading={pending} disabled={pending}>
        Bevételezés és lezárás
      </Button>
    </form>
  );
}
