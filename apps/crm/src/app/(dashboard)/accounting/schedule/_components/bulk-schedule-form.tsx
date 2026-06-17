'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { bulkScheduleAction } from '../actions';
import type { HrFormState } from '../../_components/form-utils';

export function BulkScheduleForm({
  employeeId,
  employeeName,
  employees,
  onSuccess,
}: {
  employeeId?: string;
  employeeName?: string;
  employees?: { _id: string; name: string }[];
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<
    | 'workdays'
    | 'selected_dates'
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'
    | 'sunday'
  >('workdays');
  const [selectedDates, setSelectedDates] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>(
    employeeId ? [employeeId] : (employees?.map((e) => e._id) ?? [])
  );
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
      {selectedIds.map((id) => (
        <input key={id} type="hidden" name="employeeIds" value={id} />
      ))}
      <input type="hidden" name="mode" value={mode} />
      {mode === 'selected_dates' && (
        <input type="hidden" name="selectedDates" value={selectedDates} />
      )}

      {employeeName ? (
        <div className="bg-muted/50 rounded-lg border p-3">
          <p className="text-sm font-medium">{employeeName}</p>
          <p className="text-muted-foreground text-xs">
            Műszakok létrehozása a kiválasztott időszakra
          </p>
        </div>
      ) : employees?.length ? (
        <div className="space-y-2">
          <Label>Dolgozók</Label>
          <div className="max-h-40 overflow-y-auto rounded-md border p-2">
            {employees.map((e) => (
              <label key={e._id} className="flex items-center gap-2 py-1 text-sm">
                <Checkbox
                  checked={selectedIds.includes(e._id)}
                  onCheckedChange={() =>
                    setSelectedIds((prev) =>
                      prev.includes(e._id) ? prev.filter((x) => x !== e._id) : [...prev, e._id]
                    )
                  }
                />
                {e.name}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startDate">Időszak kezdete</Label>
          <Input id="startDate" name="startDate" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">Időszak vége</Label>
          <Input id="endDate" name="endDate" type="date" required />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
        <Label htmlFor="dateMode">Mely napokra?</Label>
        <select
          id="dateMode"
          className="border-input bg-background h-9 w-full rounded-md border px-2"
          value={mode}
          onChange={(e) => setMode(e.target.value as any)}
        >
          <option value="workdays">Minden munkanap (H–P, ünnep nélkül)</option>
          <option value="monday">Csak hétfő</option>
          <option value="tuesday">Csak kedd</option>
          <option value="wednesday">Csak szerda</option>
          <option value="thursday">Csak csütörtök</option>
          <option value="friday">Csak péntek</option>
          <option value="saturday">Csak szombat</option>
          <option value="sunday">Csak vasárnap</option>
          <option value="selected_dates">Csak megadott napok</option>
        </select>
      </div>

      {mode === 'selected_dates' && (
        <div className="space-y-2">
          <Label htmlFor="datesInput">Napok (vesszővel elválasztva)</Label>
          <Input
            id="datesInput"
            placeholder="2026-06-01, 2026-06-02, 2026-06-03"
            value={selectedDates}
            onChange={(e) => setSelectedDates(e.target.value)}
          />
          <p className="text-muted-foreground text-xs">Formátum: ÉÉÉÉ-HH-NN</p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Checkbox id="skipExisting" name="skipExisting" value="true" defaultChecked />
        <Label htmlFor="skipExisting" className="text-sm font-normal">
          Már rögzített napok kihagyása (műszak, szabadság)
        </Label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="locationLabel">Helyszín címke</Label>
          <Input id="locationLabel" name="locationLabel" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="locationAddress">Cím</Label>
          <Input id="locationAddress" name="locationAddress" />
        </div>
      </div>

      <Button type="submit" loading={pending} disabled={pending || selectedIds.length === 0}>
        {pending ? 'Létrehozás…' : 'Műszakok létrehozása'}
      </Button>
    </form>
  );
}
