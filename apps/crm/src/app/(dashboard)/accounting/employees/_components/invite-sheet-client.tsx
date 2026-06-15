'use client';

import { useState } from 'react';
import { EntitySheet } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { InviteEmployeeForm } from './invite-form';

export function InviteSheetClient({ employeeId, email }: { employeeId: string; email: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        Meghívó / új fiók
      </Button>
      <EntitySheet
        open={open}
        onOpenChange={setOpen}
        title="Felhasználó meghívása"
        description="CRM belépés létrehozása a dolgozó e-mail címére."
        mode="create"
      >
        <InviteEmployeeForm
          employeeId={employeeId}
          email={email}
          onSuccess={() => setOpen(false)}
        />
      </EntitySheet>
    </>
  );
}
