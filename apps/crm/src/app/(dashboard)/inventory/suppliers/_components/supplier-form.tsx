'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { createSupplierAction, type SupplierFormState } from '../actions';
import { SupplierFormFields } from './supplier-form-fields';

const initial: SupplierFormState = { success: false };

export function CreateSupplierForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createSupplierAction, initial);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.refresh();
      onSuccess?.();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, router, onSuccess]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <SupplierFormFields compact />
      <Button type="submit" loading={pending} disabled={pending} className="w-fit">
        {pending ? 'Mentés…' : 'Beszállító létrehozása'}
      </Button>
    </form>
  );
}
