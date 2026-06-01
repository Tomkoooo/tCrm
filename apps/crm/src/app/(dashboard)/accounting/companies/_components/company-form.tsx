'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { createCompanyAction, updateCompanyAction } from '../actions';
import type { HrFormState } from '../../_components/form-utils';
import { CompanyKeyValueEditor } from './company-key-value-editor';

type CompanyOption = { _id: string; name: string };

export function CreateCompanyForm({
  parentCompanies,
  onSuccess,
}: {
  parentCompanies: CompanyOption[];
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createCompanyAction, {
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
    <CompanyFormFields
      action={action}
      pending={pending}
      parentCompanies={parentCompanies}
      fieldErrors={state.success ? undefined : state.fieldErrors}
    />
  );
}

export function EditCompanyForm({
  company,
  parentCompanies,
}: {
  company: {
    _id: string;
    name: string;
    slug: string;
    parentCompanyId?: string;
    isActive: boolean;
    companyDataEntries?: Array<{ key: string; value: string }>;
  };
  parentCompanies: CompanyOption[];
}) {
  const router = useRouter();
  const bound = updateCompanyAction.bind(null, company._id);
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
    <CompanyFormFields
      action={action}
      pending={pending}
      parentCompanies={parentCompanies.filter((c) => c._id !== company._id)}
      defaultValues={company}
      fieldErrors={state.success ? undefined : state.fieldErrors}
    />
  );
}

function CompanyFormFields({
  action,
  pending,
  parentCompanies,
  defaultValues,
  fieldErrors,
}: {
  action: (formData: FormData) => void;
  pending: boolean;
  parentCompanies: CompanyOption[];
  defaultValues?: {
    name: string;
    slug: string;
    parentCompanyId?: string;
    isActive: boolean;
    companyDataEntries?: Array<{ key: string; value: string }>;
  };
  fieldErrors?: Record<string, string[]>;
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="name">Név</Label>
        <Input id="name" name="name" defaultValue={defaultValues?.name} required />
        {fieldErrors?.name && <p className="text-destructive text-sm">{fieldErrors.name[0]}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" defaultValue={defaultValues?.slug} required />
        {fieldErrors?.slug && <p className="text-destructive text-sm">{fieldErrors.slug[0]}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="parentCompanyId">Szülő cég</Label>
        <select
          id="parentCompanyId"
          name="parentCompanyId"
          className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
          defaultValue={defaultValues?.parentCompanyId ?? ''}
        >
          <option value="">Nincs</option>
          {parentCompanies.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <CompanyKeyValueEditor initialEntries={defaultValues?.companyDataEntries} />
      <div className="flex items-center gap-2">
        <Checkbox
          id="isActive"
          name="isActive"
          defaultChecked={defaultValues?.isActive ?? true}
          value="true"
        />
        <Label htmlFor="isActive">Aktív</Label>
      </div>
      <Button type="submit" loading={pending} disabled={pending}>
        {pending ? 'Mentés…' : 'Mentés'}
      </Button>
    </form>
  );
}
