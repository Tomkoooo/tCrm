'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { deleteCategoryAction } from '../actions';
import { EditCategoryForm } from './edit-category-form';

type ParentOption = { _id: string; label: string; level: number };

export function CategoryRowActions({
  category,
  parents,
}: {
  category: {
    _id: unknown;
    slug: string;
    level: number;
    parentId?: unknown;
    names?: { hu?: string; en?: string; de?: string };
    skuPrefix?: string;
    skuTotalLength?: number;
    skuPadChar?: string;
  };
  parents: ParentOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <EditCategoryForm
          category={{
            _id: String(category._id),
            level: category.level,
            slug: category.slug,
            parentId: category.parentId ? String(category.parentId) : undefined,
            names: category.names,
            skuPrefix: category.skuPrefix,
            skuTotalLength: category.skuTotalLength,
            skuPadChar: category.skuPadChar,
          }}
          parents={parents}
        />
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            if (!confirm(`Törli a(z) „${category.slug}” kategóriát?`)) return;
            startTransition(async () => {
              const result = await deleteCategoryAction(String(category._id));
              if (!result.success) alert(result.message);
              router.refresh();
            });
          }}
        >
          Törlés
        </Button>
      </div>
    </div>
  );
}
