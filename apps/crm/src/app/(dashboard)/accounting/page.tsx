import { requireAnyPermission } from '@crm/auth';
import { connectDB } from '@crm/db';
import { countPendingRequests } from '@crm/core';
import { ACCOUNTING_NAV_PERMISSION_KEYS, HR_READ_PERMISSION_KEYS } from '@crm/lib';
import { Container } from '@crm/ui';
import Link from 'next/link';
import { getHrSessionScope } from '@/lib/hr/session-scope';
import { hasAnyPermission } from '@crm/auth';

export default async function AccountingOverviewPage() {
  await requireAnyPermission([...ACCOUNTING_NAV_PERMISSION_KEYS]);
  const { allowedCompanyIds } = await getHrSessionScope();
  const canHrRead = await hasAnyPermission([...HR_READ_PERMISSION_KEYS]);
  let pendingCount = 0;
  if (canHrRead) {
    await connectDB();
    pendingCount = await countPendingRequests(allowedCompanyIds);
  }

  return (
    <Container className="flex max-w-4xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Könyvelés és HR</h1>
        <p className="text-muted-foreground text-sm">
          Cégek, dolgozók, beosztás, kérelmek és havi kimutatások.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {canHrRead && (
          <>
            <Link
              href="/accounting/requests"
              className="border-border hover:bg-muted/50 rounded-lg border p-4 transition-colors"
            >
              <p className="font-medium">Függő kérelmek</p>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </Link>
            <Link
              href="/accounting/schedule"
              className="border-border hover:bg-muted/50 rounded-lg border p-4 transition-colors"
            >
              <p className="font-medium">Beosztás</p>
              <p className="text-muted-foreground text-sm">Naptár nézet</p>
            </Link>
            <Link
              href="/accounting/employees"
              className="border-border hover:bg-muted/50 rounded-lg border p-4 transition-colors"
            >
              <p className="font-medium">Dolgozók</p>
              <p className="text-muted-foreground text-sm">Lista és meghívás</p>
            </Link>
            <Link
              href="/accounting/reports"
              className="border-border hover:bg-muted/50 rounded-lg border p-4 transition-colors"
            >
              <p className="font-medium">Kimutatások</p>
              <p className="text-muted-foreground text-sm">Havi órák, export</p>
            </Link>
          </>
        )}
        <Link
          href="/accounting/my"
          className="border-border hover:bg-muted/50 rounded-lg border p-4 transition-colors"
        >
          <p className="font-medium">Saját beosztás</p>
          <p className="text-muted-foreground text-sm">Kérelmek benyújtása</p>
        </Link>
      </div>
    </Container>
  );
}
