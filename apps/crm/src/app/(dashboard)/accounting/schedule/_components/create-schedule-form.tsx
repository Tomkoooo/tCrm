'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createScheduleEntryAction } from '../actions';
import type { HrFormState } from '../../_components/form-utils';

export function CreateScheduleForm({
  employees,
  defaultEmployeeId,
  defaultEmployeeName,
  onSuccess,
}: {
  employees: { _id: string; name: string }[];
  defaultEmployeeId?: string;
  defaultEmployeeName?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createScheduleEntryAction, {
    success: false,
  } as HrFormState);

  const lockedEmployee =
    defaultEmployeeId && employees.some((e) => e._id === defaultEmployeeId)
      ? employees.find((e) => e._id === defaultEmployeeId)
      : undefined;

  useEffect(() => {
    if (state.success) {
      toast.success('Beosztás létrehozva.');
      router.refresh();
      onSuccess?.();
    } else if (state.message) toast.error(state.message);
  }, [state, router, onSuccess]);

  return (
    <form action={action} className="flex flex-col gap-4">
      {lockedEmployee ? (
        <>
          <input type="hidden" name="employeeId" value={lockedEmployee._id} />
          <div className="bg-muted/50 rounded-lg border p-3">
            <p className="text-sm font-medium">{defaultEmployeeName ?? lockedEmployee.name}</p>
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="employeeId">Dolgozó</Label>
          <select
            id="employeeId"
            name="employeeId"
            className="border-input bg-background h-9 w-full rounded-md border px-2"
            required
            defaultValue={defaultEmployeeId ?? ''}
          >
            <option value="">Válasszon…</option>
            {employees.map((e) => (
              <option key={e._id} value={e._id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="start">Kezdet</Label>
        <Input id="start" name="start" type="datetime-local" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="end">Vége</Label>
        <Input id="end" name="end" type="datetime-local" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="kind">Típus</Label>
        <select
          id="kind"
          name="kind"
          className="border-input bg-background h-9 w-full rounded-md border px-2"
          defaultValue="shift"
        >
          <option value="shift">Műszak</option>
          <option value="off">Szabad</option>
          <option value="training">Képzés</option>
          <option value="other">Egyéb</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="title">Cím</Label>
        <Input id="title" name="title" />
      </div>
      <Button type="submit" loading={pending} disabled={pending}>
        {pending ? 'Mentés…' : 'Létrehozás'}
      </Button>
    </form>
  );
}
