'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EntitySheet } from '@crm/ui';
import { AddToCompanyForm } from './add-to-company-form';

export function AddToCompanySheetClient({
  sourceEmployeeId,
  companies,
}: {
  sourceEmployeeId: string;
  companies: { _id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);

  if (!companies.length) return null;

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        Másik céghez adás
      </Button>
      <EntitySheet
        open={open}
        onOpenChange={setOpen}
        title="Dolgozó másik céghez"
        description="Külön dolgozói rekord — saját beosztás és szabadság."
        mode="create"
      >
        <AddToCompanyForm
          sourceEmployeeId={sourceEmployeeId}
          companies={companies}
          onSuccess={() => setOpen(false)}
        />
      </EntitySheet>
    </>
  );
}
