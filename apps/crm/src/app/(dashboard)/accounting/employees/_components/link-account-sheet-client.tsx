'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { EntitySheet } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { LinkAccountForm } from './link-account-form';
import { linkAllEmployeesByEmailAction } from '../actions';

export function LinkAccountSheetClient({
  employeeId,
  email,
}: {
  employeeId: string;
  email?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" size="sm" variant="default" onClick={() => setOpen(true)}>
        Fiók összekötése
      </Button>
      <EntitySheet
        open={open}
        onOpenChange={setOpen}
        title="CRM fiók összekötése"
        description="Meglévő felhasználó hozzárendelése ehhez a dolgozói rekordhoz."
        mode="create"
      >
        <LinkAccountForm employeeId={employeeId} email={email} onSuccess={() => setOpen(false)} />
      </EntitySheet>
    </>
  );
}

export function BulkLinkByEmailButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      loading={pending}
      disabled={pending}
      onClick={() => {
        start(async () => {
          const res = await linkAllEmployeesByEmailAction();
          if (res.success) {
            toast.success(res.message);
            router.refresh();
          } else {
            toast.error(res.message);
          }
        });
      }}
    >
      E-mail egyezés összekötése
    </Button>
  );
}
