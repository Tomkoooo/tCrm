'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { addEmployeeToCompanyAction } from '../actions';
import type { HrFormState } from '../../_components/form-utils';

export function AddToCompanyForm({
  sourceEmployeeId,
  companies,
  onSuccess,
}: {
  sourceEmployeeId: string;
  companies: { _id: string; name: string }[];
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(addEmployeeToCompanyAction, {
    success: false,
  } as HrFormState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message ?? 'Dolgozó hozzáadva a céghez.');
      router.refresh();
      onSuccess?.();
      if (state.id) router.push(`/accounting/employees/${state.id}`);
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, router, onSuccess]);

  if (!companies.length) {
    return (
      <p className="text-muted-foreground text-sm">
        Nincs más cég, ahova hozzá lehetne adni (már minden elérhető cégben szerepel).
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="sourceEmployeeId" value={sourceEmployeeId} />
      <div className="space-y-2">
        <Label htmlFor="targetCompanyId">Cég</Label>
        <select
          id="targetCompanyId"
          name="targetCompanyId"
          className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
          required
          defaultValue=""
        >
          <option value="" disabled>
            Válasszon céget…
          </option>
          {companies.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <p className="text-muted-foreground text-sm">
        Új dolgozói rekord jön létre a kiválasztott cégben — külön beosztás, szabadságkeret és
        kimutatás. A CRM fiók (ha van) megmarad közös.
      </p>
      <Button type="submit" loading={pending} disabled={pending}>
        Hozzáadás a céghez
      </Button>
    </form>
  );
}
