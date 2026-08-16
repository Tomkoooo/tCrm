'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@crm/ui';
import { Input } from '@crm/ui';
import type { PickupStatus } from '@crm/db-core';
import {
  cancelJobAction,
  checkInPickupAction,
  deliverPickupAction,
  gatherPickupAction,
  getPickupDocumentPayloadAction,
  installPickupAction,
  pickupPickupAction,
  returnPickupAction,
  scheduleJobAction,
  type JobFormState,
} from '../actions';
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
  bomComponents: PickupBomComponentView[];
  requestedQuantity: number;
  gatheredQuantity: number;
  installedQuantity: number;
  installedLocation?: string;
  returnedQuantity: number;
  checkedQuantity: number;
  lostQuantity: number;
};

function toListItem(line: JobLineView): PickupLineListItem & { isConsumable?: boolean } {
  return {
    productId: line.productId,
    sku: line.sku,
    name: line.name,
    quantity: line.requestedQuantity,
    isPrebuild: line.isPrebuild,
    bomComponents: line.bomComponents,
    isConsumable: line.isConsumable,
  };
}

export type PickupView = {
  pickupId: string;
  reference: string;
  label?: string;
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

function PickupWorkflowCard({
  jobId,
  pickup,
  canWrite,
}: {
  jobId: string;
  pickup: PickupView;
  canWrite: boolean;
}) {
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

  if (!canWrite) {
    return (
      <div className="text-muted-foreground text-sm">
        {pickup.reference} — {JOB_STATUS_LABELS[pickup.status]}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {pickup.status === 'scheduled' && (
        <>
          <p className="text-muted-foreground text-xs">
            Összeszedés után a készlet azonnal csökken ebből a raktárból.
          </p>
          <LineQuantityForm
            jobId={jobId}
            pickupId={pickup.pickupId}
            lines={pickup.lines}
            field="gatheredQuantity"
            action={gatherPickupAction}
            submitLabel="Összeszedés megerősítése"
          />
        </>
      )}
      {pickup.status === 'gathered' && (
        <Button
          type="button"
          size="sm"
          onClick={async () => {
            const res = await pickupPickupAction(jobId, pickup.pickupId);
            if (res.success) router.refresh();
          }}
        >
          Átvétel rögzítése
        </Button>
      )}
      {pickup.status === 'picked_up' && (
        <Button
          type="button"
          size="sm"
          onClick={async () => {
            const res = await deliverPickupAction(jobId, pickup.pickupId);
            if (res.success) router.refresh();
          }}
        >
          Kiszállítás a helyszínre
        </Button>
      )}
      {(pickup.status === 'delivered' || pickup.status === 'returning') && (
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
      {pickup.status === 'delivered' && (
        <>
          <p className="text-sm font-medium">Visszaszállítás</p>
          <LineQuantityForm
            jobId={jobId}
            pickupId={pickup.pickupId}
            lines={pickup.lines}
            field="returnedQuantity"
            action={returnPickupAction}
            submitLabel="Visszaszállítás indítása"
          />
        </>
      )}
      {pickup.status === 'returning' && (
        <>
          <p className="text-muted-foreground text-xs">
            Ellenőrzés után a visszaérkezett mennyiség visszakerül a raktárba.
          </p>
          <LineQuantityForm
            jobId={jobId}
            pickupId={pickup.pickupId}
            lines={pickup.lines}
            field="checkedQuantity"
            action={checkInPickupAction}
            submitLabel="Bevételezés és lezárás"
          />
        </>
      )}
      {pickup.status === 'completed' && (
        <ul className="space-y-2 text-sm">
          {pickup.lines.map((l) => (
            <PickupLineWorkflowRow key={l.productId} line={toListItem(l)}>
              <p className="text-muted-foreground text-xs">
                Összeszedve {l.gatheredQuantity}, vissza {l.checkedQuantity}
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
}: {
  jobId: string;
  jobStatus: PickupStatus;
  pickups: PickupView[];
  canWrite: boolean;
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
          <PickupWorkflowCard jobId={jobId} pickup={pickup} canWrite={canWrite} />
        </div>
      ))}
    </div>
  );
}
