'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateEmployeePersonAction } from '../actions';
import type { HrFormState } from '../../_components/form-utils';
import { EMPLOYEE_SCHEDULE_COLORS } from '@crm/lib';

type PersonValues = {
  anchorEmployeeId: string;
  name: string;
  email?: string;
  phone?: string;
  workerCategory?: 'regular' | 'occasional';
  workScheduleType?: 'full_time' | 'part_time';
  contractedWeeklyHours?: number;
  contractedDailyHours?: number;
  calendarColor?: string;
  birthName?: string;
  birthPlaceDate?: string;
  mothersName?: string;
  address?: string;
  taj?: string;
  taxId?: string;
  hrNotes?: string;
};

export function EditPersonProfileForm({ person }: { person: PersonValues }) {
  const router = useRouter();
  const bound = updateEmployeePersonAction.bind(null, person.anchorEmployeeId);
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
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="anchorEmployeeId" value={person.anchorEmployeeId} />
      <p className="text-muted-foreground text-sm">
        Közös adatok — mentéskor minden cégnél lévő rekord frissül.
      </p>
      <div className="space-y-2">
        <Label htmlFor="name">Név</Label>
        <Input id="name" name="name" defaultValue={person.name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" defaultValue={person.email} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Telefon</Label>
        <Input id="phone" name="phone" defaultValue={person.phone} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="calendarColor">Naptár szín</Label>
        <select
          id="calendarColor"
          name="calendarColor"
          className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
          defaultValue={person.calendarColor ?? ''}
        >
          <option value="">Automatikus</option>
          {EMPLOYEE_SCHEDULE_COLORS.map((color) => (
            <option key={color} value={color}>
              {color}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="workerCategory">Munkavállaló kategória</Label>
          <select
            id="workerCategory"
            name="workerCategory"
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
            defaultValue={person.workerCategory ?? 'regular'}
          >
            <option value="regular">Állandó</option>
            <option value="occasional">Alkalmi</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="workScheduleType">Munkaidő</Label>
          <select
            id="workScheduleType"
            name="workScheduleType"
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
            defaultValue={person.workScheduleType ?? 'full_time'}
          >
            <option value="full_time">Teljes munkaidő</option>
            <option value="part_time">Részmunkaidő</option>
          </select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contractedWeeklyHours">Heti óra (rész)</Label>
          <Input
            id="contractedWeeklyHours"
            name="contractedWeeklyHours"
            type="number"
            min={0}
            defaultValue={person.contractedWeeklyHours}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contractedDailyHours">Napi óra (rész)</Label>
          <Input
            id="contractedDailyHours"
            name="contractedDailyHours"
            type="number"
            min={0}
            defaultValue={person.contractedDailyHours}
          />
        </div>
      </div>
      <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
        <h3 className="text-sm font-medium">Személyes adatok</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="birthName">Születési név</Label>
            <Input id="birthName" name="birthName" defaultValue={person.birthName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthPlaceDate">Szül. hely, idő</Label>
            <Input id="birthPlaceDate" name="birthPlaceDate" defaultValue={person.birthPlaceDate} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mothersName">Anyja neve</Label>
            <Input id="mothersName" name="mothersName" defaultValue={person.mothersName} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Lakcím</Label>
            <Input id="address" name="address" defaultValue={person.address} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taj">TAJ</Label>
            <Input id="taj" name="taj" defaultValue={person.taj} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxId">Adóazonosító</Label>
            <Input id="taxId" name="taxId" defaultValue={person.taxId} />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="hrNotes">HR megjegyzés</Label>
        <Input id="hrNotes" name="hrNotes" defaultValue={person.hrNotes} />
      </div>
      <Button type="submit" loading={pending} disabled={pending}>
        {pending ? 'Mentés…' : 'Közös adatok mentése'}
      </Button>
    </form>
  );
}
