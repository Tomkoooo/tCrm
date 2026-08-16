'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

import { createWarehouseAction, type WarehouseFormState } from '../actions';
import { WarehouseStaffSelect } from './warehouse-staff-select';
import { Button, Input, Label } from '@crm/ui';

const initial: WarehouseFormState = { success: false };

export function CreateWarehouseForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createWarehouseAction, initial);

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
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor="key">Kulcs</Label>
        <Input id="key" name="key" required placeholder="pl. uj-raktar" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Név</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="flex flex-col gap-2 md:col-span-2">
        <Label htmlFor="address">Cím</Label>
        <Input id="address" name="address" />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="isActive" name="isActive" defaultChecked />
        <Label htmlFor="isActive">Aktív</Label>
      </div>
      <WarehouseStaffSelect initialSelected={[]} />
      <div>
        <Button type="submit" loading={pending} disabled={pending}>
          {pending ? 'Mentés…' : 'Raktár létrehozása'}
        </Button>
      </div>
    </form>
  );
}
