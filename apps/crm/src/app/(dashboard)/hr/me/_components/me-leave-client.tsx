'use client';

import { useState } from 'react';
import { Button, EntitySheet } from '@crm/ui';
import { TimeOffRequestForm } from '../../_components/time-off-request-form';

export function MeLeaveClient({ employeeId }: { employeeId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        Szabadság kérése
      </Button>
      <EntitySheet
        open={open}
        onOpenChange={setOpen}
        title="Szabadság kérése"
        description="A kérelem jóváhagyás után jelenik meg a naptárban."
        size="md"
        mode="create"
      >
        <TimeOffRequestForm employeeId={employeeId} onSuccess={() => setOpen(false)} />
      </EntitySheet>
    </>
  );
}
