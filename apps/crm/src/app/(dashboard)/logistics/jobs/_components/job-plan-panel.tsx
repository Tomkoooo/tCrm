'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label, Badge } from '@crm/ui';
import { SearchAutocomplete, type SearchItem } from '@crm/ui';
import { searchProductsAction } from '../../../inventory/search-actions';
import {
  lockJobPlanAction,
  proposeJobPlanAction,
  requestJobItemsAction,
  resolveItemRequestAction,
  submitJobFeedbackAction,
  updatePickupVehicleAction,
} from '../plan-actions';
import type { JobFormState } from '../actions';
import { CREW_ROLE_LABELS } from '@/lib/crew-labels';
import type { CrewRole, JobPlanStatus } from '@crm/db-core';
import { productDisplayName } from '@crm/lib';
import { ProductSkuLabel } from '@/components/product-sku-label';

export type DemandLineView = {
  id: string;
  productId?: string;
  sku: string;
  name: string;
  requestedQuantity: number;
  isOptional?: boolean;
  substitutionNote?: string;
  kitOverridden?: boolean;
  available?: number;
  shortage?: number;
  components?: Array<{ sku: string; name: string; quantity: number; shortage?: number }>;
};

export type WarehouseIssueView = {
  warehouseName: string;
  sku: string;
  name: string;
  requested: number;
  available: number;
};

export type CrewView = {
  employeeId: string;
  name: string;
  roles: CrewRole[];
};

export type ActivityView = {
  id: string;
  kind: string;
  at: string;
  message?: string;
};

export type ItemRequestView = {
  id: string;
  note: string;
  status: string;
  quantity?: number;
  productLabel?: string;
};

const PLAN_LABELS: Record<JobPlanStatus, string> = {
  draft: 'Tervezet — még nincs kör',
  proposed: 'Javasolt körök — ellenőrizd és zárold',
  locked: 'Zárolva',
};

const initial: JobFormState = { success: false };

export function JobPlanPanel({
  jobId,
  planStatus,
  demand,
  originalDemand,
  crew,
  activities,
  itemRequests,
  feedback,
  vehicles,
  pickupVehicles,
  warehouseIssues = [],
  canWrite,
  isDirector,
}: {
  jobId: string;
  planStatus: JobPlanStatus;
  demand: DemandLineView[];
  originalDemand: DemandLineView[];
  crew: CrewView[];
  activities: ActivityView[];
  itemRequests: ItemRequestView[];
  feedback?: string;
  vehicles: Array<{ id: string; name: string; plateNumber: string }>;
  pickupVehicles: Array<{ pickupId: string; label: string; vehicleId?: string; warning?: string }>;
  warehouseIssues?: WarehouseIssueView[];
  canWrite: boolean;
  isDirector: boolean;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [reqState, reqAction, reqPending] = useActionState(
    (prev: JobFormState, fd: FormData) => requestJobItemsAction(jobId, prev, fd),
    initial
  );
  const [fbState, fbAction, fbPending] = useActionState(
    (prev: JobFormState, fd: FormData) => submitJobFeedbackAction(jobId, prev, fd),
    initial
  );
  const [productId, setProductId] = useState('');

  const run = async (fn: () => Promise<JobFormState>) => {
    const res = await fn();
    setMsg(res.message ?? null);
    if (res.success) router.refresh();
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm">
        Terv: <strong>{PLAN_LABELS[planStatus] ?? planStatus}</strong>
      </p>
      {msg && <p className="text-muted-foreground text-sm">{msg}</p>}

      {canWrite && planStatus !== 'locked' && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void run(() => proposeJobPlanAction(jobId))}>
            Körök javaslata
          </Button>
          {planStatus === 'proposed' && (
            <Button type="button" onClick={() => void run(() => lockJobPlanAction(jobId))}>
              Terv zárolása
            </Button>
          )}
        </div>
      )}

      <section>
        <h3 className="mb-2 font-medium">Igénylista</h3>
        {warehouseIssues.length > 0 ? (
          <div className="border-destructive/40 mb-3 rounded-md border p-3">
            <p className="mb-2 text-sm font-medium">Hiány a kiválasztott raktár(ak)ban</p>
            <ul className="space-y-1 text-sm">
              {warehouseIssues.map((issue) => (
                <li
                  key={`${issue.warehouseName}-${issue.sku}-${issue.name}`}
                  className="flex flex-wrap justify-between gap-2"
                >
                  <span>
                    <ProductSkuLabel sku={issue.sku} name={issue.name} layout="inline" />
                    <span className="text-muted-foreground ml-2 text-xs">
                      {issue.warehouseName}
                    </span>
                  </span>
                  <span className="tabular-nums">
                    {issue.available}/{issue.requested}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <ul className="space-y-2 text-sm">
          {demand.map((l) => (
            <li key={l.id} className="rounded-md border p-2">
              <div className="flex justify-between gap-2">
                <span>
                  <ProductSkuLabel sku={l.sku} name={l.name} layout="inline" />
                  {l.isOptional ? (
                    <span className="text-muted-foreground ml-2 text-xs">opcionális</span>
                  ) : null}
                  {l.kitOverridden ? (
                    <Badge variant="secondary" className="ml-2">
                      helyi összeállítás
                    </Badge>
                  ) : null}
                </span>
                <span className="tabular-nums">{l.requestedQuantity}</span>
              </div>
              {l.shortage && l.shortage > 0 ? (
                <Badge variant="destructive" className="mt-2">
                  Hiány: {l.shortage} (van {l.available ?? 0})
                </Badge>
              ) : l.available != null ? (
                <Badge variant="secondary" className="mt-2">
                  Készleten: {l.available}
                </Badge>
              ) : null}
              {l.substitutionNote ? (
                <p className="mt-1 text-xs">
                  <span className="font-medium">Csere a csapatnak: </span>
                  {l.substitutionNote}
                </p>
              ) : null}
              {l.components && l.components.length > 0 ? (
                <ul className="text-muted-foreground mt-1 space-y-0.5 text-xs">
                  {l.components.map((c) => (
                    <li key={`${c.sku}-${c.name}`} className="flex justify-between gap-2">
                      <ProductSkuLabel sku={c.sku} name={c.name} layout="inline" />
                      <span>
                        {c.quantity}×
                        {c.shortage && c.shortage > 0 ? (
                          <span className="text-destructive ml-2">hiány {c.shortage}</span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
        {originalDemand.length > 0 && (
          <details className="mt-3">
            <summary className="text-muted-foreground cursor-pointer text-xs">
              Eredeti lista (első zároláskor)
            </summary>
            <ul className="mt-2 space-y-1 text-xs">
              {originalDemand.map((l) => (
                <li key={l.id}>
                  <ProductSkuLabel sku={l.sku} name={l.name} layout="inline" /> ·{' '}
                  {l.requestedQuantity}
                  {l.substitutionNote ? ` — ${l.substitutionNote}` : ''}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section>
        <h3 className="mb-2 font-medium">Csapat</h3>
        <ul className="space-y-1 text-sm">
          {crew.map((c) => (
            <li key={c.employeeId}>
              {c.name}{' '}
              <span className="text-muted-foreground">
                ({c.roles.map((r) => CREW_ROLE_LABELS[r]).join(', ')})
              </span>
            </li>
          ))}
        </ul>
      </section>

      {pickupVehicles.length > 0 && canWrite && planStatus !== 'locked' && (
        <section>
          <h3 className="mb-2 font-medium">Járművek a javasolt körökön</h3>
          <ul className="space-y-3 text-sm">
            {pickupVehicles.map((p) => (
              <li key={p.pickupId}>
                <p>
                  {p.label}
                  {p.warning ? <span className="ml-2 text-amber-700">{p.warning}</span> : null}
                </p>
                <select
                  className="border-input mt-1 h-9 w-full max-w-sm rounded-md border px-2 text-sm"
                  defaultValue={p.vehicleId ?? ''}
                  onChange={(e) => {
                    void run(() => updatePickupVehicleAction(jobId, p.pickupId, e.target.value));
                  }}
                >
                  <option value="">— nincs jármű —</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.plateNumber})
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </section>
      )}

      {itemRequests.length > 0 && (
        <section>
          <h3 className="mb-2 font-medium">Tételkérések</h3>
          <ul className="space-y-2 text-sm">
            {itemRequests.map((r) => (
              <li key={r.id} className="rounded-md border p-2">
                <p>
                  {r.productLabel ? `${r.productLabel} · ` : ''}
                  {r.quantity ? `${r.quantity} · ` : ''}
                  {r.note}
                </p>
                <p className="text-muted-foreground text-xs">{r.status}</p>
                {canWrite && r.status === 'pending' && (
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        void run(() => resolveItemRequestAction(jobId, r.id, 'accepted'))
                      }
                    >
                      Elfogadás
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void run(() => resolveItemRequestAction(jobId, r.id, 'rejected'))
                      }
                    >
                      Elutasítás
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {isDirector && (
        <section className="flex flex-col gap-4">
          <form action={reqAction} className="flex flex-col gap-2 rounded-md border p-3">
            <p className="text-sm font-medium">Több tétel kérése a logisztikától</p>
            {reqState.message && <p className="text-sm">{reqState.message}</p>}
            <input type="hidden" name="productId" value={productId} />
            <SearchAutocomplete
              placeholder="Termék (opcionális)"
              onSearch={searchProductsAction}
              onSelect={(item: SearchItem) => {
                const raw = item.raw as { sku?: string; names?: { hu?: string; en?: string } };
                const sku = raw?.sku ?? item.sublabel ?? item.label;
                setProductId(item.value);
                void productDisplayName(raw?.names, sku);
              }}
            />
            <Input name="quantity" type="number" min={0} step="any" placeholder="Mennyiség" />
            <Input name="note" required placeholder="Mit kérsz, és miért?" />
            <Button type="submit" size="sm" disabled={reqPending}>
              Kérés küldése
            </Button>
          </form>
          <form action={fbAction} className="flex flex-col gap-2 rounded-md border p-3">
            <p className="text-sm font-medium">Esemény visszajelzés</p>
            {fbState.message && <p className="text-sm">{fbState.message}</p>}
            <Label htmlFor="feedback">Megjegyzés a következő alkalomra</Label>
            <textarea
              id="feedback"
              name="feedback"
              className="border-input min-h-24 rounded-md border px-3 py-2 text-sm"
              defaultValue={feedback ?? ''}
            />
            <Button type="submit" size="sm" disabled={fbPending}>
              Visszajelzés mentése
            </Button>
          </form>
        </section>
      )}

      {activities.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-medium">Napló</summary>
          <ul className="mt-2 space-y-1 text-xs">
            {activities.map((a) => (
              <li key={a.id}>
                {a.at} · {a.kind}
                {a.message ? ` — ${a.message}` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
