'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Checkbox, Label } from '@crm/ui';
import { assignEmployeesAction, type JobFormState } from '../actions';
import { TeamMemberSelect } from './team-member-select';
import { EmployeeSelect } from './employee-select';

const initialState: JobFormState = { success: false };

type EmployeeRef = { id: string; label: string };

export function EmployeesPanel({
  jobId,
  canEdit,
  pickupEmployee,
  dropoffEmployee,
  crewEmployees,
  vehicles,
  vehicleId,
}: {
  jobId: string;
  canEdit: boolean;
  pickupEmployee: EmployeeRef | null;
  dropoffEmployee: EmployeeRef | null;
  crewEmployees: EmployeeRef[];
  vehicles: Array<{ id: string; name: string; plateNumber: string }>;
  vehicleId?: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    (prev: JobFormState, fd: FormData) => assignEmployeesAction(jobId, prev, fd),
    initialState
  );
  const [pickup, setPickup] = useState<EmployeeRef | null>(pickupEmployee);
  const [sameForDropoff, setSameForDropoff] = useState(!dropoffEmployee);
  const [dropoff, setDropoff] = useState<EmployeeRef | null>(dropoffEmployee);
  const [crewIds, setCrewIds] = useState<string[]>(crewEmployees.map((c) => c.id));
  const [vehicle, setVehicle] = useState(vehicleId ?? '');

  if (state.success) router.refresh();

  if (!canEdit) {
    return (
      <div className="flex flex-col gap-1 text-sm">
        <p>
          <span className="text-muted-foreground">Átvétel: </span>
          {pickupEmployee?.label ?? '—'}
        </p>
        <p>
          <span className="text-muted-foreground">Leadás: </span>
          {dropoffEmployee?.label ?? pickupEmployee?.label ?? '—'}
        </p>
        <p>
          <span className="text-muted-foreground">Csapat: </span>
          {crewEmployees.length ? crewEmployees.map((c) => c.label).join(', ') : '—'}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="pickupEmployeeId" value={pickup?.id ?? ''} />
      <input
        type="hidden"
        name="dropoffEmployeeId"
        value={sameForDropoff ? '' : (dropoff?.id ?? '')}
      />
      <input type="hidden" name="crewEmployeeIdsJson" value={JSON.stringify(crewIds)} />
      <input type="hidden" name="vehicleId" value={vehicle} />
      {state.message && (
        <p className={state.success ? 'text-sm text-green-700' : 'text-sm text-red-600'}>
          {state.message}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <Label>Átvételért felelős</Label>
        <EmployeeSelect
          selectedLabel={pickup?.label}
          onSelect={(item) => setPickup({ id: item.value, label: item.label })}
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
          <EmployeeSelect
            selectedLabel={dropoff?.label}
            onSelect={(item) => setDropoff({ id: item.value, label: item.label })}
            onClear={() => setDropoff(null)}
          />
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <Label>Egyéb csapattagok</Label>
        <TeamMemberSelect selected={crewIds} onChange={(ids) => setCrewIds(ids)} />
      </div>
      {vehicles.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="vehicle-select">Jármű (opcionális)</Label>
          <select
            id="vehicle-select"
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            value={vehicle}
            onChange={(e) => setVehicle(e.target.value)}
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
      <Button type="submit" size="sm" disabled={pending || !pickup}>
        Csapat mentése
      </Button>
    </form>
  );
}
