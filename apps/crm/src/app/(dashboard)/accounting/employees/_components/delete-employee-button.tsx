'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { deleteEmployeeAction } from '../actions';

export function DeleteEmployeeButton({
  employeeId,
  employeeName,
  companyName,
}: {
  employeeId: string;
  employeeName: string;
  companyName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      loading={pending}
      disabled={pending}
      onClick={() => {
        const label = `${employeeName} (${companyName})`;
        if (
          !confirm(
            `Törli a(z) „${label}” dolgozói rekordot?\n\nCsak akkor lehetséges, ha nincs hozzá beosztás, kérelem vagy kimutatás. A CRM fiók megmarad.`
          )
        ) {
          return;
        }
        startTransition(async () => {
          const res = await deleteEmployeeAction(employeeId);
          if (res.success) {
            toast.success(res.message);
            router.push('/accounting/employees');
            router.refresh();
          } else {
            toast.error(res.message ?? 'Hiba');
          }
        });
      }}
    >
      Rekord törlése
    </Button>
  );
}
