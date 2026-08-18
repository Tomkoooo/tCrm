'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label, Textarea, cn } from '@crm/ui';
import { createEmployeeAction, type HrFormState } from '../../actions';

const initial: HrFormState = { success: false };
const selectClassName = cn(
  'border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm'
);

export function CreateEmployeeForm({
  companies,
  defaultCompanyId,
  onSuccess,
}: {
  companies: Array<{ id: string; name: string }>;
  defaultCompanyId?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createEmployeeAction, initial);

  useEffect(() => {
    if (state.success && state.id) {
      onSuccess?.();
      router.push(`/hr/people/${state.id}`);
    }
  }, [state, onSuccess, router]);

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.message && !state.success ? (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor="companyId">
          Cég <span className="text-destructive">*</span>
        </Label>
        <select
          id="companyId"
          name="companyId"
          className={selectClassName}
          required
          defaultValue={defaultCompanyId ?? companies[0]?.id ?? ''}
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">
          Név <span className="text-destructive">*</span>
        </Label>
        <Input id="name" name="name" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="scheduleMode">Beosztás mód</Label>
        <select
          id="scheduleMode"
          name="scheduleMode"
          className={selectClassName}
          defaultValue="logistics"
        >
          <option value="logistics">Logisztika (feladatok)</option>
          <option value="roster">Roster (kézi műszak)</option>
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">Telefon</Label>
        <Input id="phone" name="phone" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Megjegyzés</Label>
        <Textarea id="notes" name="notes" rows={3} />
      </div>
      <input type="hidden" name="isActive" value="true" />
      <Button type="submit" loading={pending} disabled={pending}>
        Mentés
      </Button>
    </form>
  );
}
