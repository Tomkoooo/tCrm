import { requirePermission } from '@crm/auth';
import { connectDB, Category } from '@crm/db';
import { Container } from '@crm/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function CategoriesPage() {
  await requirePermission('inventory:read');
  await connectDB();

  const cats = await Category.find().sort({ level: 1, slug: 1 }).lean().exec();

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold">Categories</h1>
        <p className="text-muted-foreground text-sm">3-tier category tree (Phase 1 view-only).</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tree</CardTitle>
          <CardDescription>
            Manage UI (create/rename/delete) is planned next; seeded/imported categories show here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2">
            {(cats as any[]).map((c) => (
              <div key={String(c._id)} className="rounded-md border px-3 py-2 text-sm">
                <span className="text-muted-foreground">L{c.level}</span> ·{' '}
                <span className="font-medium">{c.slug}</span>
                <span className="text-muted-foreground">
                  {' '}
                  — {c.names?.en ?? c.names?.hu ?? c.names?.de ?? '—'}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}
