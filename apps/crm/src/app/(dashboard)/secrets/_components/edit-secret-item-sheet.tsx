'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { EntitySheet } from '@crm/ui';
import type { SecretValueFormat } from '@crm/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updateSecretItemAction, type SecretFormState } from '../actions';
import type { SecretItemRow } from './secret-items-panel';

const initial: SecretFormState = { success: false };

export function EditSecretItemSheet({
  projectId,
  item,
  open,
  onOpenChange,
}: {
  projectId: string;
  item: SecretItemRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [valueFormat, setValueFormat] = useState<SecretValueFormat>(item.valueFormat ?? 'single');
  const boundEdit = updateSecretItemAction.bind(null, projectId, item.id);
  const [state, action, pending] = useActionState(boundEdit, initial);

  useEffect(() => {
    if (open) {
      setValueFormat(item.valueFormat ?? 'single');
    }
  }, [open, item]);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      onOpenChange(false);
      router.refresh();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, router, onOpenChange]);

  return (
    <EntitySheet
      open={open}
      onOpenChange={onOpenChange}
      title="Kulcs szerkesztése"
      size="lg"
      mode="edit"
    >
      <form action={action} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-key">Kulcs</Label>
          <Input id="edit-key" name="key" required defaultValue={item.key} />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Érték típusa</Label>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="valueFormat"
                value="single"
                checked={valueFormat === 'single'}
                onChange={() => setValueFormat('single')}
              />
              Egysoros (jelszó, token)
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="valueFormat"
                value="multiline"
                checked={valueFormat === 'multiline'}
                onChange={() => setValueFormat('multiline')}
              />
              Többsoros (cég-, bankadatok)
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-value">Új érték (opcionális)</Label>
          <p className="text-muted-foreground text-xs">
            Hagyja üresen, ha az értéket nem szeretné módosítani.
          </p>
          {valueFormat === 'multiline' ? (
            <Textarea
              id="edit-value"
              name="value"
              rows={8}
              className="font-mono text-sm"
              autoComplete="off"
            />
          ) : (
            <Input id="edit-value" name="value" type="password" autoComplete="off" />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-description">Leírás (opcionális)</Label>
          <Input
            id="edit-description"
            name="description"
            defaultValue={item.description ?? ''}
            placeholder="Mihez tartozik ez a kulcs?"
          />
        </div>
        <Button type="submit" loading={pending} disabled={pending}>
          {pending ? 'Mentés…' : 'Mentés'}
        </Button>
      </form>
    </EntitySheet>
  );
}
