'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Checkbox, Input, Label } from '@crm/ui';
import { createDemandJobAction, previewPickupPlanAction } from '../plan-actions';
import { type JobFormState } from '../actions';
import { TeamMemberSelect } from './team-member-select';
import { CREW_ROLE_LABELS, CREW_ROLES } from '@/lib/crew-labels';
import { JobCreatePartsStep } from './job-create-parts-step';
import { JobCreateRoundsStep } from './job-create-rounds-step';
import {
  type CrewDraft,
  type DemandLineDraft,
  type DraftRound,
  type PlanDemandLine,
  type PlanProduct,
  type PlanStockSlice,
  demandLineIsValid,
  newLocalId,
  serializeDemand,
  serializePickups,
} from './job-create-types';

const initialState: JobFormState = { success: false };

const STEPS = [
  { id: 0, label: 'Alapadatok' },
  { id: 1, label: 'Tételek' },
  { id: 2, label: 'Csapat' },
  { id: 3, label: 'Átvételi körök' },
] as const;

export function JobCreateForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(createDemandJobAction, initialState);
  const [step, setStep] = useState(0);
  const [eventName, setEventName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [plannedGatherAt, setPlannedGatherAt] = useState('');
  const [plannedEventAt, setPlannedEventAt] = useState('');
  const [plannedReturnAt, setPlannedReturnAt] = useState('');
  const [note, setNote] = useState('');
  const [demand, setDemand] = useState<DemandLineDraft[]>([]);
  const [crew, setCrew] = useState<CrewDraft[]>([]);
  const [rounds, setRounds] = useState<DraftRound[]>([]);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string; key: string }>>(
    []
  );
  const [vehicles, setVehicles] = useState<
    Array<{ id: string; name: string; plateNumber: string }>
  >([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [roundsError, setRoundsError] = useState<string | undefined>();
  const [roundsLoading, setRoundsLoading] = useState(false);
  const [previewKey, setPreviewKey] = useState('');
  const [products, setProducts] = useState<PlanProduct[]>([]);
  const [stock, setStock] = useState<PlanStockSlice[]>([]);
  const [planDemand, setPlanDemand] = useState<PlanDemandLine[]>([]);

  useEffect(() => {
    if (state.success && state.id) router.push(`/logistics/jobs/${state.id}`);
  }, [state, router]);

  const directorCount = crew.filter((c) => c.roles.includes('director')).length;
  const detailsOk = eventName.trim().length > 0 && siteAddress.trim().length > 0;
  const demandOk = demand.length > 0 && demand.every(demandLineIsValid);
  const crewOk = crew.length > 0 && directorCount === 1;
  const canSubmit = demandOk && crewOk && detailsOk;

  const demandJson = JSON.stringify(serializeDemand(demand));
  const crewJson = JSON.stringify(crew.map((c) => ({ employeeId: c.employeeId, roles: c.roles })));
  const pickupsJson = JSON.stringify(serializePickups(rounds));

  const loadRounds = async () => {
    setRoundsLoading(true);
    setRoundsError(undefined);
    const key = `${demandJson}|${plannedGatherAt}|${plannedEventAt}|${plannedReturnAt}`;
    try {
      const result = await previewPickupPlanAction({
        demandJson,
        plannedEventAt: plannedEventAt || undefined,
        plannedGatherAt: plannedGatherAt || undefined,
        plannedReturnAt: plannedReturnAt || undefined,
      });
      if (!('rounds' in result)) {
        setRoundsError(result.error);
        setRounds([]);
        setWarnings([]);
        setProducts([]);
        setStock([]);
        setPlanDemand([]);
        return;
      }
      setRounds(
        result.rounds.map((round) => ({
          localId: newLocalId(),
          warehouseId: round.warehouseId,
          vehicleId: round.vehicleId ?? '',
          vehicleWarning: round.vehicleWarning,
          lines: round.lines,
        }))
      );
      setWarehouses(result.warehouses);
      setVehicles(result.vehicles);
      setProducts(result.products ?? []);
      setStock(result.stock ?? []);
      setPlanDemand(result.demand ?? []);
      setWarnings(result.warnings);
      setPreviewKey(key);
    } finally {
      setRoundsLoading(false);
    }
  };

  const goNext = async () => {
    if (step === 0 && !detailsOk) return;
    if (step === 1 && !demandOk) return;
    if (step === 2 && !crewOk) return;
    const next = Math.min(step + 1, STEPS.length - 1);
    if (next === 3) {
      const key = `${demandJson}|${plannedGatherAt}|${plannedEventAt}|${plannedReturnAt}`;
      if (key !== previewKey) await loadRounds();
    }
    setStep(next);
  };

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (step !== 3 || !canSubmit) e.preventDefault();
      }}
      className="flex flex-col gap-6"
    >
      <input type="hidden" name="eventName" value={eventName} />
      <input type="hidden" name="siteAddress" value={siteAddress} />
      <input type="hidden" name="plannedGatherAt" value={plannedGatherAt} />
      <input type="hidden" name="plannedEventAt" value={plannedEventAt} />
      <input type="hidden" name="plannedReturnAt" value={plannedReturnAt} />
      <input type="hidden" name="note" value={note} />
      <input type="hidden" name="demandJson" value={demandJson} />
      <input type="hidden" name="crewJson" value={crewJson} />
      <input type="hidden" name="pickupsJson" value={pickupsJson} />

      <ol className="flex flex-wrap gap-2">
        {STEPS.map((item) => (
          <li key={item.id}>
            <Button
              type="button"
              size="sm"
              variant={step === item.id ? 'default' : 'outline'}
              onClick={() => {
                if (item.id <= step) setStep(item.id);
              }}
            >
              {item.id + 1}. {item.label}
            </Button>
          </li>
        ))}
      </ol>

      {state.message && !state.success && (
        <p className="text-destructive text-sm" role="alert">
          {state.message}
        </p>
      )}

      {step === 0 && (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="eventName">Esemény neve</Label>
            <Input
              id="eventName"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="siteAddress">Helyszín címe</Label>
            <Input
              id="siteAddress"
              value={siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="plannedGatherAt">Összeszedés (raktár)</Label>
            <Input
              id="plannedGatherAt"
              type="datetime-local"
              value={plannedGatherAt}
              onChange={(e) => setPlannedGatherAt(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="plannedEventAt">Helyszíni időpont</Label>
            <Input
              id="plannedEventAt"
              type="datetime-local"
              value={plannedEventAt}
              onChange={(e) => setPlannedEventAt(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="plannedReturnAt">Visszaérkezés (raktár)</Label>
            <Input
              id="plannedReturnAt"
              type="datetime-local"
              value={plannedReturnAt}
              onChange={(e) => setPlannedReturnAt(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="note">Megjegyzés</Label>
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </section>
      )}

      {step === 1 && <JobCreatePartsStep demand={demand} onChange={setDemand} />}

      {step === 2 && (
        <section className="flex flex-col gap-3">
          <h3 className="font-medium">Építőcsapat és szerepek</h3>
          <p className="text-muted-foreground text-sm">
            Nincs külön raktáros. Az átvétel és a leadás az építőcsapat feladata. Pontosan egy
            építésvezető kell.
          </p>
          <TeamMemberSelect
            selected={crew.map((c) => c.employeeId)}
            onLabels={(labels) => {
              setCrew((prev) =>
                prev.map((c) => ({
                  ...c,
                  name: labels[c.employeeId] ?? c.name,
                }))
              );
            }}
            onChange={(ids, labels) => {
              setCrew((prev) => {
                const keep = new Map(prev.map((c) => [c.employeeId, c]));
                return ids.map((id) => {
                  const existing = keep.get(id);
                  const name = labels[id] ?? existing?.name ?? id;
                  if (existing) return { ...existing, name };
                  return { employeeId: id, name, roles: ['builder'] };
                });
              });
            }}
          />
          {crew.map((member) => (
            <div key={member.employeeId} className="rounded-md border p-3">
              <p className="mb-2 text-sm font-medium">{member.name}</p>
              <div className="flex flex-wrap gap-3">
                {CREW_ROLES.map((role) => (
                  <label key={role} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={member.roles.includes(role)}
                      onCheckedChange={(checked) => {
                        setCrew((prev) =>
                          prev.map((c) => {
                            if (c.employeeId !== member.employeeId) return c;
                            const next = checked
                              ? [...new Set([...c.roles, role])]
                              : c.roles.filter((r) => r !== role);
                            return { ...c, roles: next };
                          })
                        );
                      }}
                    />
                    {CREW_ROLE_LABELS[role]}
                  </label>
                ))}
              </div>
            </div>
          ))}
          {crew.length > 0 && directorCount !== 1 && (
            <p className="text-sm text-amber-700">Pontosan egy építésvezetőt jelölj ki.</p>
          )}
        </section>
      )}

      {step === 3 && (
        <JobCreateRoundsStep
          rounds={rounds}
          warehouses={warehouses}
          vehicles={vehicles}
          products={products}
          stock={stock}
          demand={planDemand}
          warnings={warnings}
          loading={roundsLoading}
          error={roundsError}
          onChange={setRounds}
          onRegenerate={() => void loadRounds()}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Vissza
        </Button>
        {step < 3 ? (
          <Button
            type="button"
            disabled={
              (step === 0 && !detailsOk) || (step === 1 && !demandOk) || (step === 2 && !crewOk)
            }
            onClick={() => void goNext()}
          >
            Tovább
          </Button>
        ) : (
          <Button type="submit" disabled={pending || !canSubmit}>
            Mentés tervezetként
          </Button>
        )}
      </div>
    </form>
  );
}
