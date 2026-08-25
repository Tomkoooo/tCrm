'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Checkbox, Input, Label } from '@crm/ui';
import { assignEmployeesAction, createJobAction, loadJobFormOptionsAction } from '../actions';
import { type JobFormState } from '../actions';
import { TeamMemberSelect } from './team-member-select';
import { EmployeeSelect } from './employee-select';
import { JobCreatePartsStep } from './job-create-parts-step';
import { type DemandLineDraft, demandLineIsValid, serializeDemand } from './job-create-types';

const initialState: JobFormState = { success: false };

const STEPS = [
  { id: 0, label: 'Alapadatok' },
  { id: 1, label: 'Tételek' },
  { id: 2, label: 'Csapat' },
] as const;

export function JobCreateForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(createJobAction, initialState);
  const [step, setStep] = useState(0);
  const [eventName, setEventName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [pickupAt, setPickupAt] = useState('');
  const [eventAt, setEventAt] = useState('');
  const [returnAt, setReturnAt] = useState('');
  const [note, setNote] = useState('');
  const [demand, setDemand] = useState<DemandLineDraft[]>([]);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string; key: string }>>(
    []
  );
  const [vehicles, setVehicles] = useState<
    Array<{ id: string; name: string; plateNumber: string }>
  >([]);

  const [pickupEmployee, setPickupEmployee] = useState<{ id: string; label: string } | null>(null);
  const [sameForDropoff, setSameForDropoff] = useState(true);
  const [dropoffEmployee, setDropoffEmployee] = useState<{ id: string; label: string } | null>(
    null
  );
  const [crewEmployeeIds, setCrewEmployeeIds] = useState<string[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    void loadJobFormOptionsAction().then((opts) => {
      setWarehouses(opts.warehouses);
      setVehicles(opts.vehicles);
    });
  }, []);

  useEffect(() => {
    if (!state.success || !state.id || assigning) return;
    setAssigning(true);
    void (async () => {
      const fd = new FormData();
      fd.set('pickupEmployeeId', pickupEmployee!.id);
      if (!sameForDropoff && dropoffEmployee) fd.set('dropoffEmployeeId', dropoffEmployee.id);
      fd.set('crewEmployeeIdsJson', JSON.stringify(crewEmployeeIds));
      if (vehicleId) fd.set('vehicleId', vehicleId);
      await assignEmployeesAction(state.id!, { success: false }, fd);
      router.push(`/logistics/jobs/${state.id}`);
    })();
  }, [state.success, state.id]);

  const detailsOk = eventName.trim().length > 0 && siteAddress.trim().length > 0;
  const demandOk = demand.length > 0 && demand.every(demandLineIsValid);
  const crewOk = Boolean(pickupEmployee) && (sameForDropoff || Boolean(dropoffEmployee));
  const canSubmit = detailsOk && demandOk && crewOk;

  const demandJson = JSON.stringify(serializeDemand(demand));

  const goNext = () => {
    if (step === 0 && !detailsOk) return;
    if (step === 1 && !demandOk) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (step !== 2 || !canSubmit) e.preventDefault();
      }}
      className="flex flex-col gap-6"
    >
      <input type="hidden" name="eventName" value={eventName} />
      <input type="hidden" name="siteAddress" value={siteAddress} />
      <input type="hidden" name="pickupAt" value={pickupAt} />
      <input type="hidden" name="eventAt" value={eventAt} />
      <input type="hidden" name="returnAt" value={returnAt} />
      <input type="hidden" name="note" value={note} />
      <input type="hidden" name="demandJson" value={demandJson} />

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
            <Label htmlFor="eventNameInput">Esemény neve</Label>
            <Input
              id="eventNameInput"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="siteAddressInput">Helyszín címe</Label>
            <Input
              id="siteAddressInput"
              value={siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pickupAtInput">Átvétel időpontja</Label>
            <Input
              id="pickupAtInput"
              type="datetime-local"
              value={pickupAt}
              onChange={(e) => setPickupAt(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="eventAtInput">Helyszíni időpont</Label>
            <Input
              id="eventAtInput"
              type="datetime-local"
              value={eventAt}
              onChange={(e) => setEventAt(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="returnAtInput">Leadás / visszaérkezés</Label>
            <Input
              id="returnAtInput"
              type="datetime-local"
              value={returnAt}
              onChange={(e) => setReturnAt(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="noteInput">Megjegyzés</Label>
            <Input id="noteInput" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </section>
      )}

      {step === 1 && (
        <JobCreatePartsStep demand={demand} warehouses={warehouses} onChange={setDemand} />
      )}

      {step === 2 && (
        <section className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label>Átvételért felelős</Label>
            <p className="text-muted-foreground text-xs">
              Ő kapja meg a tételes listát e-mailben, és ő jelenti be az alkalmazásban, hogy mit
              szedett össze.
            </p>
            <EmployeeSelect
              selectedLabel={pickupEmployee?.label}
              onSelect={(item) => setPickupEmployee({ id: item.value, label: item.label })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={sameForDropoff}
                onCheckedChange={(checked) => setSameForDropoff(Boolean(checked))}
              />
              A leadásért is ugyanő felel
            </label>
            {!sameForDropoff ? (
              <div className="flex flex-col gap-2">
                <Label>Leadásért felelős</Label>
                <EmployeeSelect
                  selectedLabel={dropoffEmployee?.label}
                  onSelect={(item) => setDropoffEmployee({ id: item.value, label: item.label })}
                  onClear={() => setDropoffEmployee(null)}
                />
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Egyéb csapattagok</Label>
            <p className="text-muted-foreground text-xs">
              Láthatják a listát, útmutatókat, képeket, és írhatnak visszajelzést. Nem ők jelentenek
              be átvételt/leadást.
            </p>
            <TeamMemberSelect
              selected={crewEmployeeIds}
              onChange={(ids) => setCrewEmployeeIds(ids)}
            />
          </div>

          {vehicles.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="vehicleSelect">Jármű (opcionális)</Label>
              <select
                id="vehicleSelect"
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
              >
                <option value="">Nincs megadva</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.plateNumber})
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>
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
        {step < 2 ? (
          <Button
            type="button"
            disabled={(step === 0 && !detailsOk) || (step === 1 && !demandOk)}
            onClick={goNext}
          >
            Tovább
          </Button>
        ) : (
          <Button type="submit" disabled={pending || assigning || !canSubmit}>
            Esemény létrehozása
          </Button>
        )}
      </div>
    </form>
  );
}
