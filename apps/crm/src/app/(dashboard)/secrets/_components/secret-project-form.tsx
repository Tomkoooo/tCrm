'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createSecretProjectAction, type SecretFormState } from '../actions';

const initial: SecretFormState = { success: false };

export function CreateSecretProjectForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createSecretProjectAction, initial);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.refresh();
      onSuccess?.();
      if (state.id) {
        router.push(`/secrets/${state.id}`);
      }
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, router, onSuccess]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Projekt neve</Label>
        <Input id="name" name="name" required placeholder="pl. Alutent production" />
        {!state.success && state.fieldErrors?.name && (
          <p className="text-destructive text-xs">{state.fieldErrors.name[0]}</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Leírás (opcionális)</Label>
        <Textarea
          id="description"
          name="description"
          rows={2}
          placeholder="pl. Alutent éles környezet — bank és API titkok"
        />
      </div>
      <p className="text-muted-foreground text-xs">
        A létrehozás után a projekt oldalán adhat hozzá titkokat (kulcs–érték párok).
      </p>
      <Button type="submit" loading={pending} disabled={pending}>
        {pending ? 'Létrehozás…' : 'Projekt létrehozása'}
      </Button>
    </form>
  );
}
