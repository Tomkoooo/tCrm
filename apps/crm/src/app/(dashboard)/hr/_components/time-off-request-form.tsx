'use client';

import { useActionState, useEffect } from 'react';
import { cn, Button, Input, Label, Textarea } from '@crm/ui';
import { requestTimeOffAction, type HrFormState } from '../actions';

const initial: HrFormState = { success: false };

const selectClassName = cn(
  'border-input bg-background ring-offset-background focus-visible:ring-ring',
  'flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none',
  'focus-visible:ring-2 focus-visible:ring-offset-2'
);

export function TimeOffRequestForm({
  employeeId,
  employeeOptions,
  allowAutoApprove,
  onSuccess,
}: {
  /** Fixed employee (self-service). */
  employeeId?: string;
  /** Manager: pick employee. */
  employeeOptions?: Array<{ id: string; name: string }>;
  allowAutoApprove?: boolean;
  onSuccess?: () => void;
}) {
  const [state, action, pending] = useActionState(requestTimeOffAction, initial);

  useEffect(() => {
    if (state.success) onSuccess?.();
  }, [state.success, onSuccess]);

  return (
    <form action={action} className="flex flex-col gap-4">
      {employeeId ? <input type="hidden" name="employeeId" value={employeeId} /> : null}
      {state.message ? (
        <p
          className={
            state.success ? 'text-sm text-green-700 dark:text-green-400' : 'text-sm text-red-600'
          }
          role={state.success ? 'status' : 'alert'}
        >
          {state.message}
        </p>
      ) : null}
      {employeeOptions && employeeOptions.length > 0 ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="employeeId">
            Dolgozó <span className="text-destructive">*</span>
          </Label>
          <select id="employeeId" name="employeeId" className={selectClassName} required>
            <option value="">Válassz…</option>
            {employeeOptions.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor="type">Típus</Label>
        <select id="type" name="type" className={selectClassName} defaultValue="leave" required>
          <option value="leave">Szabadság</option>
          <option value="sick">Betegszabadság</option>
        </select>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="start">
            Kezdet <span className="text-destructive">*</span>
          </Label>
          <Input id="start" name="start" type="date" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="end">
            Vége <span className="text-destructive">*</span>
          </Label>
          <Input id="end" name="end" type="date" required />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="note">Megjegyzés</Label>
        <Textarea id="note" name="note" rows={2} />
      </div>
      {allowAutoApprove ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="autoApprove" value="true" className="size-4" />
          Azonnal jóváhagyva (naptárra kerül)
        </label>
      ) : null}
      <Button type="submit" loading={pending} disabled={pending}>
        Kérelem küldése
      </Button>
    </form>
  );
}
