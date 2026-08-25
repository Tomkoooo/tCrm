'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Textarea } from '@crm/ui';
import { submitFeedbackAction, type JobFormState } from '../actions';

const initialState: JobFormState = { success: false };

export type FeedbackItem = {
  id: string;
  employeeName: string;
  message: string;
  createdAt: string;
};

export function FeedbackPanel({ jobId, feedback }: { jobId: string; feedback: FeedbackItem[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    (prev: JobFormState, fd: FormData) => submitFeedbackAction(jobId, prev, fd),
    initialState
  );

  if (state.success) router.refresh();

  return (
    <div className="flex flex-col gap-3">
      {feedback.length === 0 ? (
        <p className="text-muted-foreground text-sm">Még nincs visszajelzés.</p>
      ) : (
        <ul className="space-y-2">
          {feedback.map((f) => (
            <li key={f.id} className="rounded-md border p-2 text-sm">
              <p>{f.message}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {f.employeeName} · {f.createdAt}
              </p>
            </li>
          ))}
        </ul>
      )}
      <form action={formAction} className="flex flex-col gap-2">
        {state.message && !state.success && (
          <p className="text-destructive text-sm">{state.message}</p>
        )}
        <Textarea name="message" rows={2} placeholder="Visszajelzés, észrevétel…" required />
        <Button type="submit" size="sm" disabled={pending}>
          Küldés
        </Button>
      </form>
    </div>
  );
}
