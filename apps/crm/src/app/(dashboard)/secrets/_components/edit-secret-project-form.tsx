'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updateSecretProjectAction, type SecretFormState } from '../actions';

const initial: SecretFormState = { success: false };

export function EditSecretProjectForm({
  projectId,
  defaultName,
  defaultDescription,
  onSuccess,
}: {
  projectId: string;
  defaultName: string;
  defaultDescription?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const boundAction = updateSecretProjectAction.bind(null, projectId);
  const [state, action, pending] = useActionState(boundAction, initial);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.refresh();
      onSuccess?.();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, router, onSuccess]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-name">Projekt neve</Label>
        <Input id="edit-name" name="name" required defaultValue={defaultName} />
        {!state.success && state.fieldErrors?.name && (
          <p className="text-destructive text-xs">{state.fieldErrors.name[0]}</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-description">Leírás (opcionális)</Label>
        <Textarea
          id="edit-description"
          name="description"
          rows={2}
          defaultValue={defaultDescription ?? ''}
        />
      </div>
      <Button type="submit" loading={pending} disabled={pending}>
        {pending ? 'Mentés…' : 'Mentés'}
      </Button>
    </form>
  );
}
