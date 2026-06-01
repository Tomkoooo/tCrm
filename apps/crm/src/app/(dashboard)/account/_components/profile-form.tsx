'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateProfileAction, type AccountFormState } from '../actions';

const initial: AccountFormState = { success: false };

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [state, action, pending] = useActionState(updateProfileAction, initial);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      void updateSession();
      router.refresh();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, router, updateSession]);

  return (
    <form action={action} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Név</Label>
        <Input id="name" name="name" defaultValue={name} required />
        {state.success === false && state.fieldErrors?.name && (
          <p className="text-destructive text-sm">{state.fieldErrors.name[0]}</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" value={email} readOnly disabled className="bg-muted" />
        <p className="text-muted-foreground text-xs">
          Az e-mail cím csak adminisztrátor módosíthatja.
        </p>
      </div>
      <Button type="submit" loading={pending} disabled={pending}>
        {pending ? 'Mentés…' : 'Profil mentése'}
      </Button>
    </form>
  );
}
