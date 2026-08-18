import Link from 'next/link';
import { requirePermission } from '@crm/auth';
import { Container, Button } from '@crm/ui';
import { LeaveImportClient } from './_components/leave-import-client';

export default async function LeaveImportPage() {
  await requirePermission('hr:write');

  return (
    <Container className="flex max-w-3xl flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Szabadság Excel import</h1>
          <p className="text-muted-foreground text-sm">
            A meglévő éves összesítő munkafüzet formátuma (év a lapnévben, cég fejléc, havi
            oszlopok).
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/hr/leave-summary">Vissza</Link>
        </Button>
      </div>
      <LeaveImportClient />
    </Container>
  );
}
