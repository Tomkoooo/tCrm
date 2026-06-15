'use client';

import { useActionState, useEffect, useState } from 'react';
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
  email: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<'email_invite' | 'password'>('email_invite');
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
      <input type="hidden" name="mode" value={mode} />

      <div className="bg-muted/50 rounded-lg border p-3">
        <p className="text-sm">
          E-mail: <code className="bg-muted rounded px-1">{email}</code>
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          Új CRM fiók létrehozása erre a címre. Ha a cím már létezik, csatlakozási meghívó lesz.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Létrehozás módja</Label>
        <select
          className="border-input bg-background h-9 w-full rounded-md border px-2"
          value={mode}
          onChange={(e) => setMode(e.target.value as 'email_invite' | 'password')}
        >
          <option value="email_invite">E-mail meghívó küldése</option>
          <option value="password">Jelszó megadása (nincs e-mail)</option>
        </select>
      </div>

      {mode === 'email_invite' && (
        <p className="text-muted-foreground text-sm">
          A dolgozó e-mailben kapja a belépési linket. A link aktiválásakor összekötjük a fiókot.
        </p>
      )}

      {mode === 'password' && (
        <div className="space-y-2">
          <Label htmlFor="password">Kezdeti jelszó</Label>
          <Input id="password" name="password" type="password" minLength={8} required />
          <p className="text-muted-foreground text-xs">Minimum 8 karakter</p>
          {state.success === false && state.fieldErrors?.password && (
            <p className="text-destructive text-sm">{state.fieldErrors.password[0]}</p>
          )}
        </div>
      )}

      <Button type="submit" loading={pending} disabled={pending}>
        {pending
          ? 'Feldolgozás…'
          : mode === 'email_invite'
            ? 'Meghívó küldése'
            : 'Fiók létrehozása'}
      </Button>
    </form>
  );
}
