'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateCategoryAction, type CategoryFormState } from '../actions';
import { cn } from '@/lib/utils';
import { OptionalEnDeFields, hasEnDeContent } from '@/components/optional-en-de-fields';

const selectClassName = cn(
  'border-input bg-background ring-offset-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs',
  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none'
);

type ParentOption = { _id: string; label: string; level: number };

type CategoryData = {
  _id: string;
  level: number;
  slug: string;
  parentId?: string;
  names?: { hu?: string; en?: string; de?: string };
  skuPrefix?: string;
  skuTotalLength?: number;
  skuPadChar?: string;
};

export function EditCategoryForm({
  category,
  parents,
}: {
  category: CategoryData;
  parents: ParentOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const boundUpdate = updateCategoryAction.bind(null, category._id);
  const [state, action, pending] = useActionState(boundUpdate, {
    success: false,
  } satisfies CategoryFormState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      setOpen(false);
      router.refresh();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, router]);

  if (!open) {
    return (
      <Button size="sm" variant="outline" type="button" onClick={() => setOpen(true)}>
        Szerkesztés
      </Button>
    );
  }

  return (
    <form
      action={action}
      className="bg-muted/30 mt-2 grid w-full max-w-xl gap-3 rounded-md border p-3"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`level-${category._id}`}>Szint</Label>
          <select
            id={`level-${category._id}`}
            name="level"
            className={selectClassName}
            defaultValue={String(category.level)}
          >
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`parentId-${category._id}`}>Szülő kategória</Label>
          <select
            id={`parentId-${category._id}`}
            name="parentId"
            className={selectClassName}
            defaultValue={category.parentId ?? ''}
          >
            <option value="">— nincs —</option>
            {parents
              .filter((p) => p._id !== category._id)
              .map((p) => (
                <option key={p._id} value={p._id}>
                  {p.label}
                </option>
              ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`slug-${category._id}`}>Slug</Label>
          <Input id={`slug-${category._id}`} name="slug" defaultValue={category.slug} required />
        </div>
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor={`name_hu-${category._id}`}>Név (HU)</Label>
          <Input
            id={`name_hu-${category._id}`}
            name="name_hu"
            defaultValue={category.names?.hu ?? ''}
          />
          <OptionalEnDeFields defaultOpen={hasEnDeContent(category.names)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor={`name_en-${category._id}`}>Név (EN)</Label>
                <Input
                  id={`name_en-${category._id}`}
                  name="name_en"
                  defaultValue={category.names?.en ?? ''}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`name_de-${category._id}`}>Név (DE)</Label>
                <Input
                  id={`name_de-${category._id}`}
                  name="name_de"
                  defaultValue={category.names?.de ?? ''}
                />
              </div>
            </div>
          </OptionalEnDeFields>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`skuPrefix-${category._id}`}>SKU előtag</Label>
          <Input
            id={`skuPrefix-${category._id}`}
            name="skuPrefix"
            defaultValue={category.skuPrefix ?? ''}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`skuTotalLength-${category._id}`}>SKU teljes hossz</Label>
          <Input
            id={`skuTotalLength-${category._id}`}
            name="skuTotalLength"
            type="number"
            defaultValue={category.skuTotalLength ?? ''}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={pending} disabled={pending}>
          {pending ? 'Mentés…' : 'Mentés'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Mégse
        </Button>
      </div>
    </form>
  );
}
