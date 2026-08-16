'use client';

import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@crm/ui';
import { Input } from '@crm/ui';
import { Label } from '@crm/ui';
import { changePasswordAction, type AccountFormState } from '../actions';

const initial: AccountFormState = { success: false };

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initial);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form action={action} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="currentPassword">Jelenlegi jelszó</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="newPassword">Új jelszó</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          autoComplete="new-password"
        />
        {state.success === false && state.fieldErrors?.newPassword && (
          <p className="text-destructive text-sm">{state.fieldErrors.newPassword[0]}</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmNewPassword">Új jelszó megerősítése</Label>
        <Input
          id="confirmNewPassword"
          name="confirmNewPassword"
          type="password"
          required
          autoComplete="new-password"
        />
        {state.success === false && state.fieldErrors?.confirmNewPassword && (
          <p className="text-destructive text-sm">{state.fieldErrors.confirmNewPassword[0]}</p>
        )}
      </div>
      <Button type="submit" loading={pending} disabled={pending}>
        {pending ? 'Mentés…' : 'Jelszó módosítása'}
      </Button>
    </form>
  );
}
