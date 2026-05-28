import { requirePermission } from '@crm/auth';
import { Container } from '@crm/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ImportClient } from './preview';

export default async function ImportPage() {
  await requirePermission('inventory:import');

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold">Inventory Import</h1>
        <p className="text-muted-foreground text-sm">Upload Excel, preview, then commit.</p>
      </div>
      <ImportClient />
      <Card>
        <CardHeader>
          <CardTitle>Template</CardTitle>
          <CardDescription>Use the schema columns from `docs/excel/Alutent.xlsx`.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Phase 1 focuses on round-trippable import. Template download is wired in Phase 1 export
            step.
          </p>
        </CardContent>
      </Card>
    </Container>
  );
}
