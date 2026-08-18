'use client';

import { useState } from 'react';
import { Button, EntitySheet } from '@crm/ui';
import { TimeOffRequestForm } from '../../_components/time-off-request-form';

export function LeavePageClient({
  canWrite,
  employeeOptions,
}: {
  canWrite: boolean;
  employeeOptions: Array<{ id: string; name: string }>;
}) {
  const [open, setOpen] = useState(false);

  if (!canWrite) return null;

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        Új távollét
      </Button>
      <EntitySheet
        open={open}
        onOpenChange={setOpen}
        title="Új távollét"
        description="Szabadság vagy betegszabadság rögzítése."
        size="md"
        mode="create"
      >
        <TimeOffRequestForm
          employeeOptions={employeeOptions}
          allowAutoApprove
          onSuccess={() => setOpen(false)}
        />
      </EntitySheet>
    </>
  );
}
