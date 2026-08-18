'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button, Label, cn } from '@crm/ui';
import { addEmployeeToCompanyAction, type HrFormState } from '../../actions';

const initial: HrFormState = { success: false };
const selectClassName = cn(
  'border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm'
);

export function AddToCompanyForm({
  sourceEmployeeId,
  companies,
}: {
  sourceEmployeeId: string;
  companies: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(addEmployeeToCompanyAction, initial);

  useEffect(() => {
    if (state.success && state.id) router.push(`/hr/people/${state.id}`);
  }, [state, router]);

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="sourceEmployeeId" value={sourceEmployeeId} />
      <div className="flex min-w-[12rem] flex-col gap-1">
        <Label htmlFor="targetCompanyId">Hozzáadás céghez</Label>
        <select id="targetCompanyId" name="targetCompanyId" className={selectClassName} required>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <select name="scheduleMode" className={selectClassName} defaultValue="logistics">
        <option value="logistics">Logisztika</option>
        <option value="roster">Roster</option>
      </select>
      <Button type="submit" size="sm" loading={pending}>
        Hozzáadás
      </Button>
      {state.message && !state.success ? (
        <p className="text-destructive w-full text-xs">{state.message}</p>
      ) : null}
    </form>
  );
}
