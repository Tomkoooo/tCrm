import { productDisplayName } from '@crm/lib';

export type CategoryOption = {
  slug: string;
  label: string;
};

type CategoryNode = {
  _id: unknown;
  parentId?: unknown;
  slug: string;
  names?: { hu?: string; en?: string; de?: string };
  level: number;
};

export function flattenCategoryOptions(cats: CategoryNode[]): CategoryOption[] {
  const byParent = new Map<string | null, CategoryNode[]>();
  for (const cat of cats) {
    const key = cat.parentId ? String(cat.parentId) : null;
    const list = byParent.get(key) ?? [];
    list.push(cat);
    byParent.set(key, list);
  }

  const out: CategoryOption[] = [];
  const walk = (parentId: string | null, depth: number) => {
    const children = byParent.get(parentId) ?? [];
    for (const cat of children) {
      const name = productDisplayName(cat.names, cat.slug);
      const indent = depth > 0 ? `${'—'.repeat(depth)} ` : '';
      out.push({
        slug: cat.slug,
        label: `${indent}${name} (${cat.slug})`,
      });
      walk(String(cat._id), depth + 1);
    }
  };
  walk(null, 0);
  return out;
}
