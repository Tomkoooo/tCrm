'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createCategoryAction, type CategoryFormState } from '../actions';
import { cn } from '@/lib/utils';

const initial: CategoryFormState = { success: false };

const selectClassName = cn(
  'border-input bg-background ring-offset-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs',
  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none'
);

type ParentOption = { _id: string; label: string; level: number };

export function CreateCategoryForm({ parents }: { parents: ParentOption[] }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createCategoryAction, initial);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.refresh();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, router]);

  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor="level">Szint</Label>
        <select id="level" name="level" className={selectClassName} defaultValue="1">
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="parentId">Szülő kategória</Label>
        <select id="parentId" name="parentId" className={selectClassName} defaultValue="">
          <option value="">— nincs —</option>
          {parents.map((p) => (
            <option key={p._id} value={p._id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name_hu">Név (HU)</Label>
        <Input id="name_hu" name="name_hu" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="skuPrefix">SKU előtag</Label>
        <Input id="skuPrefix" name="skuPrefix" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="skuTotalLength">SKU teljes hossz</Label>
        <Input id="skuTotalLength" name="skuTotalLength" type="number" />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" loading={pending} disabled={pending}>
          {pending ? 'Mentés…' : 'Kategória létrehozása'}
        </Button>
      </div>
    </form>
  );
}
