'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { createEmployeeAction, updateEmployeeAction } from '../actions';
import type { HrFormState } from '../../_components/form-utils';

type CompanyOption = { _id: string; name: string };

export function CreateEmployeeForm({
  companies,
  onSuccess,
}: {
  companies: CompanyOption[];
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createEmployeeAction, {
    success: false,
  } as HrFormState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message ?? 'Mentve.');
      router.refresh();
      onSuccess?.();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, router, onSuccess]);

  return (
    <EmployeeFormFields
      action={action}
      pending={pending}
      companies={companies}
      fieldErrors={state.success ? undefined : state.fieldErrors}
    />
  );
}

export function EditEmployeeForm({
  employee,
  companies,
}: {
  employee: {
    _id: string;
    companyId: string;
    name: string;
    email?: string;
    employeeNumber?: string;
    department?: string;
    phone?: string;
    employmentType: 'employee' | 'guest';
    isActive: boolean;
    hrNotes?: string;
  };
  companies: CompanyOption[];
}) {
  const router = useRouter();
  const bound = updateEmployeeAction.bind(null, employee._id);
  const [state, action, pending] = useActionState(bound, { success: false } as HrFormState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message ?? 'Mentve.');
      router.refresh();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, router]);

  return (
    <EmployeeFormFields
      action={action}
      pending={pending}
      companies={companies}
      defaultValues={employee}
      fieldErrors={state.success ? undefined : state.fieldErrors}
    />
  );
}

function EmployeeFormFields({
  action,
  pending,
  companies,
  defaultValues,
  fieldErrors,
}: {
  action: (formData: FormData) => void;
  pending: boolean;
  companies: CompanyOption[];
  defaultValues?: {
    companyId: string;
    name: string;
    email?: string;
    employeeNumber?: string;
    department?: string;
    phone?: string;
    employmentType: 'employee' | 'guest';
    isActive: boolean;
    hrNotes?: string;
  };
  fieldErrors?: Record<string, string[]>;
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="companyId">Cég</Label>
        <select
          id="companyId"
          name="companyId"
          className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
          defaultValue={defaultValues?.companyId ?? ''}
          required
        >
          <option value="" disabled>
            Válasszon…
          </option>
          {companies.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Név</Label>
        <Input id="name" name="name" defaultValue={defaultValues?.name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" defaultValue={defaultValues?.email} />
        {fieldErrors?.email && <p className="text-destructive text-sm">{fieldErrors.email[0]}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="employeeNumber">Dolgozói szám</Label>
        <Input
          id="employeeNumber"
          name="employeeNumber"
          defaultValue={defaultValues?.employeeNumber}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="department">Osztály</Label>
        <Input id="department" name="department" defaultValue={defaultValues?.department} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Telefon</Label>
        <Input id="phone" name="phone" defaultValue={defaultValues?.phone} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="employmentType">Típus</Label>
        <select
          id="employmentType"
          name="employmentType"
          className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
          defaultValue={defaultValues?.employmentType ?? 'guest'}
        >
          <option value="guest">Vendég (nincs belépés)</option>
          <option value="employee">Dolgozó</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="hrNotes">HR megjegyzés</Label>
        <Input id="hrNotes" name="hrNotes" defaultValue={defaultValues?.hrNotes} />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="isActive"
          name="isActive"
          defaultChecked={defaultValues?.isActive ?? true}
          value="true"
        />
        <Label htmlFor="isActive">Aktív</Label>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Mentés…' : 'Mentés'}
      </Button>
    </form>
  );
}
