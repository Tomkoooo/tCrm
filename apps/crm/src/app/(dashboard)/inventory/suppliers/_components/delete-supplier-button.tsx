'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { deleteSupplierAction } from '../actions';
import { Button } from '@crm/ui';

export function DeleteSupplierButton({ id, name }: { id: string; name: string }) {
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
        if (!confirm(`Törli a(z) „${name}” beszállítót?`)) return;
        startTransition(async () => {
          const result = await deleteSupplierAction(id);
          if (!result.success) {
            alert(result.message);
            return;
          }
          router.push('/inventory/suppliers');
          router.refresh();
        });
      }}
    >
      Beszállító törlése
    </Button>
  );
}
