'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { completeOnboardingAction } from '../actions';
import type { HrFormState } from '../../_components/form-utils';

type EmployeeDraft = {
  _id: string;
  name: string;
  companyId: string;
  companyName: string;
  employeeNumber: string;
  department: string;
  phone: string;
  hrNotes: string;
};

export function OnboardingClient({ employees }: { employees: EmployeeDraft[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(employees[0]?._id ?? '');
  const selected = employees.find((e) => e._id === selectedId) ?? employees[0];
  const [state, action, pending] = useActionState(completeOnboardingAction, {
    success: false,
  } as HrFormState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message ?? 'Profil mentve.');
      router.replace('/accounting/my');
    } else if (state.message && !state.fieldErrors) {
      toast.error(state.message);
    }
  }, [state, router]);

  if (!selected) return null;

  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <input type="hidden" name="employeeId" value={selected._id} />

      {employees.length > 1 && (
        <div className="space-y-2">
          <Label htmlFor="employeePick">Cég / dolgozói profil</Label>
          <select
            id="employeePick"
            className="border-input bg-background h-9 w-full rounded-md border px-2"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {employees.map((e) => (
              <option key={e._id} value={e._id}>
                {e.name} — {e.companyName}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="employeeNumber">Dolgozói szám</Label>
        <Input
          id="employeeNumber"
          name="employeeNumber"
          key={`num-${selected._id}`}
          defaultValue={selected.employeeNumber}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="department">Osztály</Label>
        <Input
          id="department"
          name="department"
          key={`dept-${selected._id}`}
          defaultValue={selected.department}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Telefon</Label>
        <Input
          id="phone"
          name="phone"
          key={`phone-${selected._id}`}
          defaultValue={selected.phone}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hrNotes">Megjegyzés</Label>
        <Input
          id="hrNotes"
          name="hrNotes"
          key={`notes-${selected._id}`}
          defaultValue={selected.hrNotes}
        />
      </div>

      <Button type="submit" loading={pending} disabled={pending}>
        {pending ? 'Mentés…' : 'Profil mentése és folytatás'}
      </Button>
    </form>
  );
}
