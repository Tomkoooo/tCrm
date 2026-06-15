'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { bulkScheduleAction } from '../actions';
import type { HrFormState } from '../../_components/form-utils';

export function BulkScheduleForm({
  employees,
  onSuccess,
}: {
  employees: { _id: string; name: string }[];
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<'workdays' | 'selected_dates'>('workdays');
  const [selectedDates, setSelectedDates] = useState('');
  const [state, action, pending] = useActionState(bulkScheduleAction, {
    success: false,
  } as HrFormState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message ?? 'Beosztások létrehozva.');
      router.refresh();
      onSuccess?.();
    } else if (state.message) toast.error(state.message);
  }, [state, router, onSuccess]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="mode" value={mode} />
      {mode === 'selected_dates' && (
        <input type="hidden" name="selectedDates" value={selectedDates} />
      )}

      <div className="space-y-2">
        <Label htmlFor="employeeIds">Dolgozók</Label>
        <select
          id="employeeIds"
          name="employeeIds"
          multiple
          className="border-input bg-background min-h-[120px] w-full rounded-md border px-2 py-1"
          required
        >
          {employees.map((e) => (
            <option key={e._id} value={e._id}>
              {e.name}
            </option>
          ))}
        </select>
        <p className="text-muted-foreground text-xs">Több választás: Cmd/Ctrl + kattintás</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startDate">Dátumtól</Label>
          <Input id="startDate" name="startDate" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">Dátumig</Label>
          <Input id="endDate" name="endDate" type="date" required />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="shiftStartTime">Műszak kezdete</Label>
          <Input
            id="shiftStartTime"
            name="shiftStartTime"
            type="time"
            defaultValue="09:00"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shiftEndTime">Műszak vége</Label>
          <Input id="shiftEndTime" name="shiftEndTime" type="time" defaultValue="17:00" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Alkalmazás módja</Label>
        <select
          className="border-input bg-background h-9 w-full rounded-md border px-2"
          value={mode}
          onChange={(e) => setMode(e.target.value as 'workdays' | 'selected_dates')}
        >
          <option value="workdays">Minden munkanap (hétköznap, ünnepnélkül)</option>
          <option value="selected_dates">
            Kiválasztott napok (vesszővel elválasztva, pl. 2026-06-01,2026-06-02)
          </option>
        </select>
      </div>

      {mode === 'selected_dates' && (
        <div className="space-y-2">
          <Label htmlFor="datesInput">Dátumok</Label>
          <Input
            id="datesInput"
            placeholder="2026-06-01, 2026-06-02"
            value={selectedDates}
            onChange={(e) => setSelectedDates(e.target.value)}
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <input type="checkbox" id="skipExisting" name="skipExisting" value="true" defaultChecked />
        <Label htmlFor="skipExisting">Meglévő műszak / szabadság napok kihagyása</Label>
      </div>

      <Button type="submit" loading={pending} disabled={pending}>
        {pending ? 'Létrehozás…' : 'Tömeges beosztás alkalmazása'}
      </Button>
    </form>
  );
}
