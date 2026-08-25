'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@crm/ui';
import { updateJobDemandAction, type JobFormState } from '../actions';
import { JobCreatePartsStep } from './job-create-parts-step';
import { type DemandLineDraft, demandLineIsValid, serializeDemand } from './job-create-types';

const initialState: JobFormState = { success: false };

export function DemandEditPanel({
  jobId,
  initialDemand,
  warehouses,
}: {
  jobId: string;
  initialDemand: DemandLineDraft[];
  warehouses: Array<{ id: string; name: string; key: string }>;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    (prev: JobFormState, fd: FormData) => updateJobDemandAction(jobId, prev, fd),
    initialState
  );
  const [demand, setDemand] = useState<DemandLineDraft[]>(initialDemand);

  if (state.success) router.refresh();

  const ok = demand.length > 0 && demand.every(demandLineIsValid);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="demandJson" value={JSON.stringify(serializeDemand(demand))} />
      {state.message && (
        <p className={state.success ? 'text-sm text-green-700' : 'text-sm text-red-600'}>
          {state.message}
        </p>
      )}
      <JobCreatePartsStep demand={demand} warehouses={warehouses} onChange={setDemand} />
      <Button type="submit" size="sm" disabled={pending || !ok}>
        Igénylista mentése
      </Button>
    </form>
  );
}
