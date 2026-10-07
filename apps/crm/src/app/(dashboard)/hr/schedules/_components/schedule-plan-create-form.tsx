'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangleIcon } from 'lucide-react';
import { Badge, Button, Checkbox, Input, Label, Textarea, cn } from '@crm/ui';
import { createSchedulePlanAction, type FormState } from '../actions';

const initial: FormState = { success: false };
const selectClassName = cn(
  'border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm'
);

export type PlanFormEmployee = {
  id: string;
  name: string;
  companyId: string;
  email?: string;
  hasUser: boolean;
};

/** Monday of the week containing `date`, as a `YYYY-MM-DD` key. */
function mondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function addDaysKey(dayKey: string, days: number): string {
  const d = new Date(`${dayKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function SchedulePlanCreateForm({
  companies,
  employees,
}: {
  companies: Array<{ id: string; name: string }>;
  employees: PlanFormEmployee[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createSchedulePlanAction, initial);

  const defaultStart = useMemo(() => mondayOf(new Date()), []);
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? '');
  const [startDateKey, setStartDateKey] = useState(defaultStart);
  const [endDateKey, setEndDateKey] = useState(addDaysKey(defaultStart, 27));
  const [selected, setSelected] = useState<string[]>([]);

  const companyEmployees = useMemo(
    () => employees.filter((e) => e.companyId === companyId),
    [employees, companyId]
  );

  // Employee columns belong to one company, so switching companies clears the picks.
  useEffect(() => {
    setSelected((prev) => prev.filter((id) => companyEmployees.some((e) => e.id === id)));
  }, [companyEmployees]);

  useEffect(() => {
    if (state.success && state.planId) router.push(`/hr/schedules/${state.planId}`);
  }, [state, router]);

  const unreachable = companyEmployees.filter(
    (e) => selected.includes(e.id) && (!e.email || !e.hasUser)
  );

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const fieldError = (key: string) => state.success === false && state.fieldErrors?.[key]?.[0];

  return (
    <form action={action} className="flex flex-col gap-6">
      {state.success === false && state.message ? (
        <p className="text-sm text-red-600">{state.message}</p>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">
          Megnevezés <span className="text-red-600">*</span>
        </Label>
        <Input
          id="title"
          name="title"
          required
          maxLength={200}
          placeholder="pl. 2026. október — Eseménycsapat"
        />
        {fieldError('title') ? <p className="text-sm text-red-600">{fieldError('title')}</p> : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="companyId">
          Cég <span className="text-red-600">*</span>
        </Label>
        <select
          id="companyId"
          name="companyId"
          required
          className={selectClassName}
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="startDateKey">
            Első nap <span className="text-red-600">*</span>
          </Label>
          <Input
            id="startDateKey"
            name="startDateKey"
            type="date"
            required
            value={startDateKey}
            onChange={(e) => setStartDateKey(e.target.value)}
          />
          {fieldError('startDateKey') ? (
            <p className="text-sm text-red-600">{fieldError('startDateKey')}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="endDateKey">
            Utolsó nap <span className="text-red-600">*</span>
          </Label>
          <Input
            id="endDateKey"
            name="endDateKey"
            type="date"
            required
            value={endDateKey}
            min={startDateKey}
            onChange={(e) => setEndDateKey(e.target.value)}
          />
          {fieldError('endDateKey') ? (
            <p className="text-sm text-red-600">{fieldError('endDateKey')}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="defaultStartTime">Alapértelmezett kezdés</Label>
          <Input id="defaultStartTime" name="defaultStartTime" type="time" defaultValue="08:00" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="defaultShiftHours">Műszak hossza (óra)</Label>
          <Input
            id="defaultShiftHours"
            name="defaultShiftHours"
            type="number"
            min={0.25}
            max={24}
            step={0.25}
            defaultValue={8}
          />
        </div>
      </div>
      <p className="text-muted-foreground -mt-4 text-xs">
        Ezek töltik ki a rács időpontjait, ha egy cellánál csak a helyszínt adod meg. Cellánként
        bármikor átírható.
      </p>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <Label>
            Dolgozók <span className="text-red-600">*</span>
          </Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelected(companyEmployees.map((e) => e.id))}
            >
              Mind
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setSelected([])}>
              Egyik sem
            </Button>
          </div>
        </div>

        {companyEmployees.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Ehhez a céghez nincs aktív dolgozó. Vedd fel őket a Dolgozók menüben.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {companyEmployees.map((employee) => (
              <label
                key={employee.id}
                className="hover:bg-muted/50 flex items-center gap-2 rounded-md border p-2 text-sm"
              >
                <Checkbox
                  checked={selected.includes(employee.id)}
                  onCheckedChange={() => toggle(employee.id)}
                />
                <span className="flex-1">{employee.name}</span>
                {!employee.email ? (
                  <Badge variant="outline" className="text-xs">
                    nincs e-mail
                  </Badge>
                ) : !employee.hasUser ? (
                  <Badge variant="outline" className="text-xs">
                    nincs fiók
                  </Badge>
                ) : null}
              </label>
            ))}
          </div>
        )}

        {selected.map((id) => (
          <input key={id} type="hidden" name="employeeIds" value={id} />
        ))}
        {fieldError('employeeIds') ? (
          <p className="text-sm text-red-600">{fieldError('employeeIds')}</p>
        ) : null}

        {unreachable.length > 0 ? (
          <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">
                {unreachable.length} kiválasztott dolgozó nem kap e-mailt kiküldéskor:
              </p>
              <p>
                {unreachable
                  .map((e) => `${e.name} (${!e.email ? 'nincs e-mail' : 'nincs CRM fiók'})`)
                  .join(', ')}
              </p>
              <p className="mt-1">
                Beoszthatók, de az egykattintásos belépéshez összekapcsolt CRM fiók kell.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Megjegyzés a dolgozóknak (opcionális)</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={2}
          maxLength={2000}
          placeholder="Megjelenik a kiküldött e-mailben."
        />
      </div>

      <Button type="submit" loading={pending} loadingText="Létrehozás…" disabled={!selected.length}>
        Beosztás létrehozása
      </Button>
    </form>
  );
}
