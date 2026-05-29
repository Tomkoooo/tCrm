'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { inviteEmployeeAction } from '../actions';
import type { HrFormState } from '../../_components/form-utils';

export function InviteEmployeeForm({
  employeeId,
  email,
  onSuccess,
}: {
  employeeId: string;
  email?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(inviteEmployeeAction, {
    success: false,
  } as HrFormState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message ?? 'Meghívva.');
      router.refresh();
      onSuccess?.();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, router, onSuccess]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="employeeId" value={employeeId} />
      <p className="text-muted-foreground text-sm">
        E-mail: <strong>{email ?? '—'}</strong> (a dolgozó rekordból)
      </p>
      <div className="space-y-2">
        <Label htmlFor="password">Kezdeti jelszó</Label>
        <Input id="password" name="password" type="password" required minLength={8} />
        {state.success === false && state.fieldErrors?.password && (
          <p className="text-destructive text-sm">{state.fieldErrors.password[0]}</p>
        )}
      </div>
      <Button type="submit" disabled={pending || !email}>
        {pending ? 'Meghívás…' : 'Felhasználó létrehozása'}
      </Button>
    </form>
  );
}
