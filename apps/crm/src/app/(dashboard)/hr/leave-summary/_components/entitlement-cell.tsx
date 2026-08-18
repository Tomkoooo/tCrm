'use client';

import { useActionState } from 'react';
import { Input, Button } from '@crm/ui';
import { upsertLeaveYearAction, type HrFormState } from '../../actions';

const initial: HrFormState = { success: false };

export function EntitlementCell({
  employeeId,
  year,
  value,
}: {
  employeeId: string;
  year: number;
  value: number;
}) {
  const [state, action, pending] = useActionState(upsertLeaveYearAction, initial);

  return (
    <form action={action} className="flex items-center gap-1">
      <input type="hidden" name="employeeId" value={employeeId} />
      <input type="hidden" name="year" value={year} />
      <Input
        name="entitlementDays"
        type="number"
        min={0}
        step={1}
        defaultValue={value}
        className="h-8 w-16 px-1 text-sm"
      />
      <Button type="submit" size="sm" variant="ghost" loading={pending} disabled={pending}>
        ✓
      </Button>
      {state.message && !state.success ? (
        <span className="text-destructive text-xs">{state.message}</span>
      ) : null}
    </form>
  );
}
