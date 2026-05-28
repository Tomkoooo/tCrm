import { requirePermission, hasPermission } from '@crm/auth';
import { connectDB, Category } from '@crm/db';
import { Container } from '@crm/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateCategoryForm } from './_components/category-form';
import { CategoryRowActions } from './_components/category-row-actions';

export default async function CategoriesPage() {
  await requirePermission('inventory:read');
  await connectDB();

  const canWrite = await hasPermission('inventory:write');
  const cats = await Category.find().sort({ level: 1, slug: 1 }).lean().exec();

  const parentOptions = cats.map((c) => ({
    _id: String(c._id),
    level: c.level,
    label: `${'—'.repeat(c.level - 1)} ${c.names?.hu ?? c.names?.en ?? c.slug} (${c.slug})`,
  }));

  const byParent = new Map<string | null, typeof cats>();
  for (const c of cats) {
    const key = c.parentId ? String(c.parentId) : null;
    const list = byParent.get(key) ?? [];
    list.push(c);
    byParent.set(key, list);
  }

  function renderLevel(parentId: string | null, depth: number) {
    const children = byParent.get(parentId) ?? [];
    return children.map((c) => (
      <div key={String(c._id)} style={{ marginLeft: depth * 16 }}>
        <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
          <div>
            <span className="text-muted-foreground">Szint {c.level}</span> ·{' '}
            <span className="font-medium">{c.slug}</span>
            <span className="text-muted-foreground">
              {' '}
              — {c.names?.hu ?? c.names?.en ?? c.names?.de ?? '—'}
            </span>
            {c.skuPrefix && (
              <span className="text-muted-foreground ml-2 text-xs">
                SKU: {c.skuPrefix}/{c.skuTotalLength}
              </span>
            )}
          </div>
          {canWrite && <CategoryRowActions category={c} parents={parentOptions} />}
        </div>
        {renderLevel(String(c._id), depth + 1)}
      </div>
    ));
  }

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold">Termékkategóriák</h1>
        <p className="text-muted-foreground text-sm">
          Háromszintű CRM kategórifa. Az import Excel{' '}
          <code className="text-xs">crm_category_slug</code> oszlopában ezek a slug értékek
          szerepeljenek.
        </p>
      </div>

      {canWrite && (
        <Card>
          <CardHeader>
            <CardTitle>Új kategória</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateCategoryForm parents={parentOptions} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Kategóriafa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">{renderLevel(null, 0)}</div>
        </CardContent>
      </Card>
    </Container>
  );
}
