'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { updateSupplierAction, type SupplierFormState } from '../actions';
import { SupplierFormFields } from './supplier-form-fields';

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
  contacts?: Record<string, string | undefined>;
};

export function EditSupplierForm({ supplier }: { supplier: SupplierData }) {
  const router = useRouter();
  const bound = updateSupplierAction.bind(null, supplier._id);
  const [state, action, pending] = useActionState(bound, {
    success: false,
  } satisfies SupplierFormState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.refresh();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, router]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <SupplierFormFields supplier={supplier} keyReadOnly />
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? 'Mentés…' : 'Mentés'}
      </Button>
    </form>
  );
}
