'use client';

import { useState } from 'react';
import { EntitySheet } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { EditSecretProjectForm } from './edit-secret-project-form';

export function EditSecretProjectButton({
  projectId,
  name,
  description,
}: {
  projectId: string;
  name: string;
  description?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Projekt szerkesztése
      </Button>
      <EntitySheet
        open={open}
        onOpenChange={setOpen}
        title="Projekt szerkesztése"
        size="md"
        mode="edit"
      >
        <EditSecretProjectForm
          projectId={projectId}
          defaultName={name}
          defaultDescription={description}
          onSuccess={() => setOpen(false)}
        />
      </EntitySheet>
    </>
  );
}
