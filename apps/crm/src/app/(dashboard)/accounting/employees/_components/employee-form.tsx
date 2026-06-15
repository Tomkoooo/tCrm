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

type EmployeeValues = {
  companyId: string;
  name: string;
  email?: string;
  employeeNumber?: string;
  department?: string;
  phone?: string;
  employmentType: 'employee' | 'guest';
  workerCategory?: 'regular' | 'occasional';
  workScheduleType?: 'full_time' | 'part_time';
  contractedWeeklyHours?: number;
  contractedDailyHours?: number;
  payType?: 'monthly' | 'hourly';
  monthlySalaryHuf?: number;
  hourlyRateHuf?: number;
  birthName?: string;
  birthPlaceDate?: string;
  mothersName?: string;
  address?: string;
  taj?: string;
  taxId?: string;
  isActive: boolean;
  hrNotes?: string;
};

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
  employee: EmployeeValues & { _id: string };
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
  defaultValues?: EmployeeValues;
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
      <div className="grid gap-4 md:grid-cols-2">
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
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Telefon</Label>
        <Input id="phone" name="phone" defaultValue={defaultValues?.phone} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="employmentType">Belépés típus</Label>
          <select
            id="employmentType"
            name="employmentType"
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
            defaultValue={defaultValues?.employmentType ?? 'guest'}
          >
            <option value="guest">Vendég (nincs belépés)</option>
            <option value="employee">Dolgozó (van belépés)</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="workerCategory">Munkavállaló kategória</Label>
          <select
            id="workerCategory"
            name="workerCategory"
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
            defaultValue={defaultValues?.workerCategory ?? 'regular'}
          >
            <option value="regular">Állandó</option>
            <option value="occasional">Alkalmi</option>
          </select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="workScheduleType">Munkaidő</Label>
          <select
            id="workScheduleType"
            name="workScheduleType"
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
            defaultValue={defaultValues?.workScheduleType ?? 'full_time'}
          >
            <option value="full_time">Teljes munkaidő</option>
            <option value="part_time">Részmunkaidő</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="contractedWeeklyHours">Heti óra (rész)</Label>
          <Input
            id="contractedWeeklyHours"
            name="contractedWeeklyHours"
            type="number"
            min={0}
            defaultValue={defaultValues?.contractedWeeklyHours}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contractedDailyHours">Napi óra (rész)</Label>
          <Input
            id="contractedDailyHours"
            name="contractedDailyHours"
            type="number"
            min={0}
            defaultValue={defaultValues?.contractedDailyHours}
          />
        </div>
      </div>

      <div className="border-border grid gap-4 rounded-lg border p-4 md:grid-cols-3">
        <h3 className="text-sm font-medium md:col-span-3">Bérezés (kimutatások)</h3>
        <div className="space-y-2">
          <Label htmlFor="payType">Bér típus</Label>
          <select
            id="payType"
            name="payType"
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
            defaultValue={defaultValues?.payType ?? ''}
          >
            <option value="">Nincs megadva</option>
            <option value="monthly">Havi bruttó</option>
            <option value="hourly">Órabér</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="monthlySalaryHuf">Havi bruttó (HUF)</Label>
          <Input
            id="monthlySalaryHuf"
            name="monthlySalaryHuf"
            type="number"
            min={0}
            defaultValue={defaultValues?.monthlySalaryHuf}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hourlyRateHuf">Órabér (HUF)</Label>
          <Input
            id="hourlyRateHuf"
            name="hourlyRateHuf"
            type="number"
            min={0}
            defaultValue={defaultValues?.hourlyRateHuf}
          />
        </div>
      </div>

      <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
        <h3 className="text-sm font-medium">Személyes adatok (alkalmi / HR)</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="birthName">Születési név</Label>
            <Input id="birthName" name="birthName" defaultValue={defaultValues?.birthName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthPlaceDate">Szül. hely, idő</Label>
            <Input
              id="birthPlaceDate"
              name="birthPlaceDate"
              defaultValue={defaultValues?.birthPlaceDate}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mothersName">Anyja neve</Label>
            <Input id="mothersName" name="mothersName" defaultValue={defaultValues?.mothersName} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Lakcím</Label>
            <Input id="address" name="address" defaultValue={defaultValues?.address} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taj">TAJ</Label>
            <Input id="taj" name="taj" defaultValue={defaultValues?.taj} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxId">Adóazonosító</Label>
            <Input id="taxId" name="taxId" defaultValue={defaultValues?.taxId} />
          </div>
        </div>
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
      <Button type="submit" loading={pending} disabled={pending}>
        {pending ? 'Mentés…' : 'Mentés'}
      </Button>
    </form>
  );
}
