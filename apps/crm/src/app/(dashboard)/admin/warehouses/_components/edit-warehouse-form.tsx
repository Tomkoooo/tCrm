'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { deleteWarehouseAction, updateWarehouseAction, type WarehouseFormState } from '../actions';
import { WarehouseStaffSelect } from './warehouse-staff-select';

const initial: WarehouseFormState = { success: false };

export function EditWarehouseForm({
  id,
  initial: data,
}: {
  id: string;
  initial: {
    key: string;
    name: string;
    address: string;
    isActive: boolean;
    assignedUserIds: string[];
  };
}) {
  const router = useRouter();
  const boundUpdate = updateWarehouseAction.bind(null, id);
  const [state, action, pending] = useActionState(boundUpdate, initial);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.refresh();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, router]);

  const onDelete = async () => {
    if (!confirm('Biztosan törli ezt a raktárat?')) return;
    const result = await deleteWarehouseAction(id);
    if (result.success) {
      toast.success(result.message);
      router.push('/admin/warehouses');
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="key">Kulcs</Label>
          <Input id="key" name="key" defaultValue={data.key} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Név</Label>
          <Input id="name" name="name" defaultValue={data.name} required />
        </div>
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="address">Cím</Label>
          <Input id="address" name="address" defaultValue={data.address} />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="isActive" name="isActive" defaultChecked={data.isActive} />
          <Label htmlFor="isActive">Aktív</Label>
        </div>
        <WarehouseStaffSelect initialSelected={data.assignedUserIds} />
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? 'Mentés…' : 'Mentés'}
          </Button>
          <Button type="button" variant="destructive" onClick={onDelete}>
            Törlés
          </Button>
        </div>
      </form>
    </div>
  );
}
