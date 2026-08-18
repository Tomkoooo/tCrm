'use client';

import { useActionState, useEffect } from 'react';
import { cn, Button, Input, Label, Textarea } from '@crm/ui';
import { saveRosterShiftAction, deleteRosterShiftAction, type HrFormState } from '../actions';
import { formatHrDateTimeLocal } from '@crm/lib';
import type { HrCalendarEvent } from './hr-calendar';

const initial: HrFormState = { success: false };
const selectClassName = cn(
  'border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs'
);

export function RosterShiftForm({
  employeeId,
  event,
  onDone,
}: {
  employeeId: string;
  event?: HrCalendarEvent | null;
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState(saveRosterShiftAction, initial);
  const [delState, delAction, delPending] = useActionState(deleteRosterShiftAction, initial);

  useEffect(() => {
    if (state.success || delState.success) onDone?.();
  }, [state.success, delState.success, onDone]);

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-3">
        {event?.id ? <input type="hidden" name="id" value={event.id} /> : null}
        <input type="hidden" name="employeeId" value={employeeId} />
        {state.message ? (
          <p className={state.success ? 'text-sm text-green-700' : 'text-sm text-red-600'}>
            {state.message}
          </p>
        ) : null}
        <div className="flex flex-col gap-2">
          <Label htmlFor="kind">Típus</Label>
          <select
            id="kind"
            name="kind"
            className={selectClassName}
            defaultValue={event?.kind === 'other' ? 'other' : 'shift'}
          >
            <option value="shift">Műszak</option>
            <option value="other">Egyéb</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="title">Cím</Label>
          <Input id="title" name="title" defaultValue={event?.title ?? ''} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="start">Kezdet</Label>
            <Input
              id="start"
              name="start"
              type="datetime-local"
              required
              defaultValue={event ? formatHrDateTimeLocal(event.start) : ''}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="end">Vége</Label>
            <Input
              id="end"
              name="end"
              type="datetime-local"
              required
              defaultValue={event ? formatHrDateTimeLocal(event.end) : ''}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="notes">Megjegyzés</Label>
          <Textarea id="notes" name="notes" rows={2} />
        </div>
        <Button type="submit" loading={pending} disabled={pending}>
          Mentés
        </Button>
      </form>
      {event?.id ? (
        <form action={delAction}>
          <input type="hidden" name="id" value={event.id} />
          <Button type="submit" variant="destructive" size="sm" loading={delPending}>
            Törlés
          </Button>
        </form>
      ) : null}
    </div>
  );
}
