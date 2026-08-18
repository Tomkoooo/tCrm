'use client';

import { useActionState } from 'react';
import { Button } from '@crm/ui';
import { cancelTimeOffAction, type HrFormState } from '../../actions';

const initial: HrFormState = { success: false };

export function CancelTimeOffButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState(cancelTimeOffAction, initial);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="ghost" loading={pending}>
        Visszavonás
      </Button>
      {state.message && !state.success ? (
        <span className="text-destructive text-xs">{state.message}</span>
      ) : null}
    </form>
  );
}
