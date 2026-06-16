import { requirePermission } from '@crm/auth';
import { Container } from '@crm/ui';
import { LeaveImportClient } from './_components/leave-import-client';

export default async function LeaveImportPage() {
  await requirePermission('hr:reports');

  return (
    <Container className="flex max-w-5xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Szabadság import</h1>
        <p className="text-muted-foreground text-sm">
          Excel szabadság összesítő feltöltése — cégek és dolgozók név alapján párosítva.
        </p>
      </div>
      <LeaveImportClient />
    </Container>
  );
}
