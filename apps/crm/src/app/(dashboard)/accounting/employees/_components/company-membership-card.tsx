'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { updateEmployeeMembershipAction } from '../actions';
import type { HrFormState } from '../../_components/form-utils';
import { DeleteEmployeeButton } from './delete-employee-button';

export type CompanyMembershipValues = {
  employeeId: string;
  companyName: string;
  employeeName: string;
  department?: string;
  employeeNumber?: string;
  payType?: 'monthly' | 'hourly';
  monthlySalaryHuf?: number;
  hourlyRateHuf?: number;
  isActive: boolean;
  employmentType: 'employee' | 'guest';
};

export function CompanyMembershipCard({
  membership,
  canWrite,
}: {
  membership: CompanyMembershipValues;
  canWrite: boolean;
}) {
  const router = useRouter();
  const bound = updateEmployeeMembershipAction.bind(null, membership.employeeId);
  const [state, action, pending] = useActionState(bound, { success: false } as HrFormState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message ?? 'Mentve.');
      router.refresh();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, router]);

  if (!canWrite) {
    return (
      <div className="border-border rounded-lg border p-4">
        <h3 className="font-medium">{membership.companyName}</h3>
        <dl className="mt-2 grid gap-1 text-sm">
          <div>
            <dt className="text-muted-foreground inline">Osztály: </dt>
            <dd className="inline">{membership.department ?? '—'}</dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <form action={action} className="border-border flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-medium">{membership.companyName}</h3>
        <DeleteEmployeeButton
          employeeId={membership.employeeId}
          employeeName={membership.employeeName}
          companyName={membership.companyName}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`department-${membership.employeeId}`}>Osztály</Label>
          <Input
            id={`department-${membership.employeeId}`}
            name="department"
            defaultValue={membership.department}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`employeeNumber-${membership.employeeId}`}>Dolgozói szám</Label>
          <Input
            id={`employeeNumber-${membership.employeeId}`}
            name="employeeNumber"
            defaultValue={membership.employeeNumber}
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor={`payType-${membership.employeeId}`}>Bér típus</Label>
          <select
            id={`payType-${membership.employeeId}`}
            name="payType"
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
            defaultValue={membership.payType ?? ''}
          >
            <option value="">Nincs megadva</option>
            <option value="monthly">Havi bruttó</option>
            <option value="hourly">Órabér</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`monthlySalaryHuf-${membership.employeeId}`}>Havi bruttó (HUF)</Label>
          <Input
            id={`monthlySalaryHuf-${membership.employeeId}`}
            name="monthlySalaryHuf"
            type="number"
            min={0}
            defaultValue={membership.monthlySalaryHuf}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`hourlyRateHuf-${membership.employeeId}`}>Órabér (HUF)</Label>
          <Input
            id={`hourlyRateHuf-${membership.employeeId}`}
            name="hourlyRateHuf"
            type="number"
            min={0}
            defaultValue={membership.hourlyRateHuf}
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`employmentType-${membership.employeeId}`}>Státusz</Label>
          <select
            id={`employmentType-${membership.employeeId}`}
            name="employmentType"
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
            defaultValue={membership.employmentType}
          >
            <option value="guest">Külsős / vendég</option>
            <option value="employee">Alkalmazott</option>
          </select>
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Checkbox
            id={`isActive-${membership.employeeId}`}
            name="isActive"
            defaultChecked={membership.isActive}
            value="true"
          />
          <Label htmlFor={`isActive-${membership.employeeId}`}>Aktív ebben a cégben</Label>
        </div>
      </div>
      <Button type="submit" size="sm" loading={pending} disabled={pending}>
        {membership.companyName} mentése
      </Button>
    </form>
  );
}
