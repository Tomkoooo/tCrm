'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Checkbox, Input } from '@crm/ui';
import type { CrewRole, PickupStatus } from '@crm/db-core';
import {
  cancelJobAction,
  deliverPickupAction,
  gatherPickupAction,
  getPickupDocumentPayloadAction,
  installPickupAction,
  pickupPickupAction,
  returnPickupAction,
  scheduleJobAction,
  type JobFormState,
} from '../actions';
import { CheckInLineForm } from './check-in-form';
import { JOB_STATUS_LABELS } from './job-status-labels';
import {
  PickupLineWorkflowRow,
  type PickupBomComponentView,
  type PickupLineListItem,
} from './pickup-lines-list';

export type JobLineView = {
  productId: string;
  sku: string;
  name: string;
  isConsumable: boolean;
  isPrebuild: boolean;
  isOptional?: boolean;
  bomComponents: PickupBomComponentView[];
  requestedQuantity: number;
  gatheredQuantity: number;
  installedQuantity: number;
  installedLocation?: string;
  returnedQuantity: number;
  checkedQuantity: number;
  lostQuantity: number;
  inboundHandoffQuantity?: number;
};

function toListItem(
  line: JobLineView
): PickupLineListItem & { isConsumable?: boolean; isOptional?: boolean } {
  return {
    productId: line.productId,
    sku: line.sku,
    name: line.name,
    quantity: line.requestedQuantity,
    isPrebuild: line.isPrebuild,
    bomComponents: line.bomComponents,
    isConsumable: line.isConsumable,
    isOptional: line.isOptional,
  };
}

export type PickupView = {
  pickupId: string;
  reference: string;
  label?: string;
  warehouseId: string;
  warehouseName: string;
  vehicleLabel: string;
  teamLabels: string[];
  status: PickupStatus;
  contactEmails: string[];
  pendingNotifications: string[];
  lines: JobLineView[];
};

const initialState: JobFormState = { success: false };

function LineQuantityForm({
  jobId,
  pickupId,
  lines,
  field,
  action,
  submitLabel,
  showLocation,
}: {
  jobId: string;
  pickupId: string;
  lines: JobLineView[];
  field: 'gatheredQuantity' | 'installedQuantity' | 'returnedQuantity' | 'checkedQuantity';
  action: (jobId: string, prev: JobFormState, fd: FormData) => Promise<JobFormState>;
  submitLabel: string;
  showLocation?: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    (prev: JobFormState, fd: FormData) => action(jobId, prev, fd),
    initialState
  );
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      lines.map((l) => [
        l.productId,
        {
          qty: String(field === 'gatheredQuantity' ? (l.requestedQuantity ?? 0) : (l[field] ?? 0)),
          location: l.installedLocation ?? '',
        },
      ])
    )
  );

  const linesJson = JSON.stringify(
    lines.map((l) => {
      const v = values[l.productId];
      if (field === 'installedQuantity') {
        return {
          productId: l.productId,
          installedQuantity: Number(v?.qty) || 0,
          installedLocation: v?.location || undefined,
        };
      }
      return {
        productId: l.productId,
        [field]: Number(v?.qty) || 0,
      };
    })
  );

  if (state.success) {
    router.refresh();
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="pickupId" value={pickupId} />
      <input type="hidden" name="linesJson" value={linesJson} />
      {state.message && (
        <p className={state.success ? 'text-sm text-green-700' : 'text-sm text-red-600'}>
          {state.message}
        </p>
      )}
      <ul className="space-y-2">
        {lines.map((l) => (
          <PickupLineWorkflowRow key={l.productId} line={toListItem(l)}>
            <div className="flex flex-wrap gap-2">
              <Input
                type="number"
                min={0}
                step="any"
                className="w-28"
                value={values[l.productId]?.qty ?? '0'}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    [l.productId]: { ...prev[l.productId], qty: e.target.value },
                  }))
                }
              />
              {showLocation && (
                <Input
                  placeholder="Helyszín (opc.)"
                  className="min-w-[140px] flex-1"
                  value={values[l.productId]?.location ?? ''}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [l.productId]: { ...prev[l.productId], location: e.target.value },
                    }))
                  }
                />
              )}
            </div>
          </PickupLineWorkflowRow>
        ))}
      </ul>
      <Button type="submit" size="sm" loading={pending} disabled={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}

function CheckboxLineForm({
  jobId,
  pickupId,
  lines,
  field,
  action,
  submitLabel,
}: {
  jobId: string;
  pickupId: string;
  lines: JobLineView[];
  field: 'gatheredQuantity' | 'returnedQuantity' | 'checkedQuantity' | 'installedQuantity';
  action: (jobId: string, prev: JobFormState, fd: FormData) => Promise<JobFormState>;
  submitLabel: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    (prev: JobFormState, fd: FormData) => action(jobId, prev, fd),
    initialState
  );
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(lines.map((l) => [l.productId, !l.isOptional]))
  );

  const linesJson = JSON.stringify(
    lines.map((l) => ({
      productId: l.productId,
      [field]: checked[l.productId] ? l.requestedQuantity : 0,
    }))
  );

  if (state.success) router.refresh();

  const required = lines.filter((l) => !l.isOptional);
  const optional = lines.filter((l) => l.isOptional);

  const renderLine = (l: JobLineView) => {
    const inbound = field === 'gatheredQuantity' ? (l.inboundHandoffQuantity ?? 0) : 0;
    const fromWarehouse = Math.max(0, l.requestedQuantity - inbound);
    return (
      <PickupLineWorkflowRow key={l.productId} line={toListItem(l)}>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <Checkbox
            className="size-6"
            checked={Boolean(checked[l.productId])}
            onCheckedChange={(v) => setChecked((prev) => ({ ...prev, [l.productId]: v === true }))}
          />
          <span className="flex flex-col">
            <span>Megvan ({l.requestedQuantity})</span>
            {inbound > 0 ? (
              <span className="text-muted-foreground text-xs">
                {inbound} db már a kocsin (átadásból)
                {fromWarehouse > 0 ? ` · raktárból ${fromWarehouse}` : ' · raktárból nem kell'}
              </span>
            ) : null}
          </span>
        </label>
      </PickupLineWorkflowRow>
    );
  };

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="pickupId" value={pickupId} />
      <input type="hidden" name="linesJson" value={linesJson} />
      {state.message && (
        <p className={state.success ? 'text-sm text-green-700' : 'text-sm text-red-600'}>
          {state.message}
        </p>
      )}
      {required.length > 0 && <ul className="space-y-3">{required.map(renderLine)}</ul>}
      {optional.length > 0 && (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Opcionális — pipáld, ha tényleg felmegy
          </p>
          <ul className="space-y-3">{optional.map(renderLine)}</ul>
        </div>
      )}
      <Button type="submit" size="sm" loading={pending} disabled={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}

function PickupWorkflowCard({
  jobId,
  pickup,
  canWrite,
  crewRoles,
  warehouses,
}: {
  jobId: string;
  pickup: PickupView;
  canWrite: boolean;
  crewRoles: CrewRole[];
  warehouses: Array<{ id: string; name: string }>;
}) {
  const can = (role: CrewRole) => canWrite || crewRoles.includes(role);
  const router = useRouter();
  const [docMsg, setDocMsg] = useState<string | null>(null);
  const [docLoading, setDocLoading] = useState<'packing_list' | 'return_slip' | null>(null);

  const loadDoc = async (type: 'packing_list' | 'pickup_slip' | 'return_slip') => {
    if (docLoading) return;
    setDocLoading(type === 'return_slip' ? 'return_slip' : 'packing_list');
    try {
      const res = await getPickupDocumentPayloadAction(jobId, pickup.pickupId, type);
      if (res.success) {
        setDocMsg(`${type} előkészítve (${res.payload.lines.length} tétel) — PDF/e-mail hamarosan`);
        console.info('[logistics-document]', res.payload);
      } else {
        setDocMsg(res.message ?? 'Hiba');
      }
    } finally {
      setDocLoading(null);
    }
  };

  const canAct =
    canWrite ||
    can('pickup') ||
    can('driver') ||
    can('builder') ||
    can('dropoff') ||
    can('director');

  if (!canAct) {
    return (
      <div className="text-muted-foreground text-sm">
        {pickup.reference} — {JOB_STATUS_LABELS[pickup.status]}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {pickup.status === 'scheduled' && can('pickup') && (
        <>
          <p className="text-muted-foreground text-xs">
            Pipáld ki, ami megvan. A készlet a megerősítéskor csökken. Ami előző eseményről jött, az
            már a kocsin van — azt nem szedjük újra a raktárból.
          </p>
          <CheckboxLineForm
            jobId={jobId}
            pickupId={pickup.pickupId}
            lines={pickup.lines}
            field="gatheredQuantity"
            action={gatherPickupAction}
            submitLabel="Összeszedés megerősítése"
          />
        </>
      )}
      {pickup.status === 'gathered' && can('driver') && (
        <Button
          type="button"
          size="sm"
          onClick={async () => {
            const res = await pickupPickupAction(jobId, pickup.pickupId);
            if (res.success) router.refresh();
          }}
        >
          Felrakva / elindultunk
        </Button>
      )}
      {pickup.status === 'picked_up' && can('driver') && (
        <Button
          type="button"
          size="sm"
          onClick={async () => {
            const res = await deliverPickupAction(jobId, pickup.pickupId);
            if (res.success) router.refresh();
          }}
        >
          Megérkeztünk a helyszínre
        </Button>
      )}
      {(pickup.status === 'delivered' || pickup.status === 'returning') && can('builder') && (
        <>
          <p className="text-sm font-medium">Telepítés (opcionális)</p>
          <LineQuantityForm
            jobId={jobId}
            pickupId={pickup.pickupId}
            lines={pickup.lines}
            field="installedQuantity"
            action={installPickupAction}
            submitLabel="Telepítés mentése"
            showLocation
          />
        </>
      )}
      {pickup.status === 'delivered' && (can('driver') || can('dropoff')) && (
        <>
          <p className="text-sm font-medium">Visszaszállítás</p>
          <CheckboxLineForm
            jobId={jobId}
            pickupId={pickup.pickupId}
            lines={pickup.lines}
            field="returnedQuantity"
            action={returnPickupAction}
            submitLabel="Visszaszállítás indítása"
          />
        </>
      )}
      {pickup.status === 'returning' && can('dropoff') && (
        <>
          <p className="text-muted-foreground text-xs">
            Add meg, mi érkezett vissza, és hova kerül: raktár (akár másik), vagy a következő
            esemény.
          </p>
          <CheckInLineForm
            jobId={jobId}
            pickupId={pickup.pickupId}
            originWarehouseId={pickup.warehouseId}
            warehouses={warehouses}
            lines={pickup.lines}
          />
        </>
      )}
      {pickup.status === 'completed' && (
        <ul className="space-y-2 text-sm">
          {pickup.lines.map((l) => (
            <PickupLineWorkflowRow key={l.productId} line={toListItem(l)}>
              <p className="text-muted-foreground text-xs">
                Összeszedve {l.gatheredQuantity}, vissza {l.checkedQuantity}
                {l.inboundHandoffQuantity ? ` · átadásból ${l.inboundHandoffQuantity}` : ''}
                {!l.isConsumable && l.lostQuantity > 0 && (
                  <span className="text-amber-700"> · hiány {l.lostQuantity}</span>
                )}
              </p>
            </PickupLineWorkflowRow>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 border-t pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={docLoading === 'packing_list'}
          loadingText="Betöltés…"
          onClick={() => void loadDoc('packing_list')}
        >
          Csomaglista (PDF előkészítés)
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={docLoading === 'return_slip'}
          loadingText="Betöltés…"
          onClick={() => void loadDoc('return_slip')}
        >
          Visszáru jegyzék
        </Button>
      </div>
      {docMsg && <p className="text-muted-foreground text-xs">{docMsg}</p>}
      {pickup.pendingNotifications.length > 0 && (
        <p className="text-muted-foreground text-xs">
          Várakozó értesítések: {pickup.pendingNotifications.join(', ')}
        </p>
      )}
    </div>
  );
}

export function JobWorkflowPanel({
  jobId,
  jobStatus,
  pickups,
  canWrite,
  crewRoles,
  substitutionNotes = [],
  warehouses,
}: {
  jobId: string;
  jobStatus: PickupStatus;
  pickups: PickupView[];
  canWrite: boolean;
  crewRoles: CrewRole[];
  substitutionNotes?: Array<{ name: string; note: string }>;
  warehouses: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm">
        Esemény állapot: <strong>{JOB_STATUS_LABELS[jobStatus]}</strong> · {pickups.length} átvételi
        kör
      </p>
      {msg && <p className="text-muted-foreground text-sm">{msg}</p>}
      {substitutionNotes.length > 0 && (
        <div className="rounded-md border p-3">
          <p className="mb-1 text-sm font-medium">Cserék a csapatnak</p>
          <ul className="space-y-1 text-sm">
            {substitutionNotes.map((row) => (
              <li key={`${row.name}-${row.note}`}>
                <span className="font-medium">{row.name}: </span>
                {row.note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {jobStatus === 'draft' && canWrite && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={async () => {
              const res = await scheduleJobAction(jobId);
              setMsg(res.message ?? '');
              if (res.success) router.refresh();
            }}
          >
            Összes kör ütemezése
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={async () => {
              const res = await cancelJobAction(jobId);
              setMsg(res.message ?? '');
              if (res.success) router.refresh();
            }}
          >
            Esemény törlése
          </Button>
        </div>
      )}

      {pickups.map((pickup) => (
        <div key={pickup.pickupId} className="rounded-lg border p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-medium">
                {pickup.label || pickup.reference}
                <span className="text-muted-foreground ml-2 text-sm font-normal">
                  {pickup.reference}
                </span>
              </h3>
              <p className="text-muted-foreground text-xs">
                {pickup.warehouseName}
                {pickup.vehicleLabel !== '—' && ` · ${pickup.vehicleLabel}`}
              </p>
              {pickup.teamLabels.length > 0 && (
                <p className="text-muted-foreground text-xs">
                  Csapat: {pickup.teamLabels.join(', ')}
                </p>
              )}
              {pickup.contactEmails.length > 0 && (
                <p className="text-muted-foreground text-xs">
                  E-mail: {pickup.contactEmails.join(', ')}
                </p>
              )}
            </div>
            <span className="text-sm font-medium">{JOB_STATUS_LABELS[pickup.status]}</span>
          </div>
          <PickupWorkflowCard
            jobId={jobId}
            pickup={pickup}
            canWrite={canWrite}
            crewRoles={crewRoles}
            warehouses={warehouses}
          />
        </div>
      ))}
    </div>
  );
}
