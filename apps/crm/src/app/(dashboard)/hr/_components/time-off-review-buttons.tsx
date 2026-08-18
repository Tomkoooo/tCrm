'use client';

import { useActionState } from 'react';
import { Button } from '@crm/ui';
import { reviewTimeOffAction, type HrFormState } from '../actions';

const initial: HrFormState = { success: false };

export function TimeOffReviewButtons({ id }: { id: string }) {
  const [state, action, pending] = useActionState(reviewTimeOffAction, initial);

  return (
    <div className="flex flex-col gap-1">
      {state.message && !state.success ? (
        <p className="text-destructive text-xs" role="alert">
          {state.message}
        </p>
      ) : null}
      {state.success && state.message ? (
        <p className="text-xs text-green-700 dark:text-green-400" role="status">
          {state.message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <form action={action}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="decision" value="approved" />
          <Button type="submit" size="sm" loading={pending} disabled={pending}>
            Jóváhagyás
          </Button>
        </form>
        <form action={action}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="decision" value="rejected" />
          <Button type="submit" size="sm" variant="outline" loading={pending} disabled={pending}>
            Elutasítás
          </Button>
        </form>
      </div>
    </div>
  );
}
