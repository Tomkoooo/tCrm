'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { updateSupplierAction, type SupplierFormState } from '../actions';
import type { SupplierContactEntry } from '@crm/lib';
import { SupplierFormFields } from './supplier-form-fields';
import { Button } from '@crm/ui';

type SupplierData = {
  _id: string;
  key: string;
  name: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  taxNo?: string;
  euTaxNo?: string;
  registry?: string;
  contacts?: SupplierContactEntry[];
};

export function EditSupplierForm({
  supplier,
  compact = false,
  onSuccess,
}: {
  supplier: SupplierData;
  compact?: boolean;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const bound = updateSupplierAction.bind(null, supplier._id);
  const [state, action, pending] = useActionState(bound, {
    success: false,
  } satisfies SupplierFormState);

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
      <SupplierFormFields supplier={supplier} keyReadOnly compact={compact} />
      <Button type="submit" loading={pending} disabled={pending} className="w-fit">
        {pending ? 'Mentés…' : 'Mentés'}
      </Button>
    </form>
  );
}
