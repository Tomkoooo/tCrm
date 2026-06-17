'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PlusIcon, TrashIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createScheduleEntryAction } from '../actions';
import type { HrFormState } from '../../_components/form-utils';

export function CreateScheduleForm({
  employees,
  defaultEmployeeId,
  defaultEmployeeName,
  onSuccess,
}: {
  employees: { _id: string; name: string }[];
  defaultEmployeeId?: string;
  defaultEmployeeName?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createScheduleEntryAction, {
    success: false,
  } as HrFormState);

  const [locations, setLocations] = useState<
    Array<{ label: string; address?: string; start: string; end: string }>
  >([]);
  const [newLabel, setNewLabel] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [showAddLocation, setShowAddLocation] = useState(false);

  const lockedEmployee =
    defaultEmployeeId && employees.some((e) => e._id === defaultEmployeeId)
      ? employees.find((e) => e._id === defaultEmployeeId)
      : undefined;

  useEffect(() => {
    if (state.success) {
      toast.success('Beosztás létrehozva.');
      router.refresh();
      onSuccess?.();
    } else if (state.message) toast.error(state.message);
  }, [state, router, onSuccess]);

  const handleAddLocation = () => {
    if (!newLabel || !newStart || !newEnd) {
      toast.error('A helyszín neve, kezdete és vége kötelező.');
      return;
    }
    if (newEnd <= newStart) {
      toast.error('A befejezés időpontja későbbi kell legyen, mint a kezdet.');
      return;
    }
    setLocations((prev) => [
      ...prev,
      { label: newLabel, address: newAddress || undefined, start: newStart, end: newEnd },
    ]);
    setNewLabel('');
    setNewAddress('');
    setNewStart('');
    setNewEnd('');
    setShowAddLocation(false);
  };

  const handleRemoveLocation = (index: number) => {
    setLocations((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locationsJson" value={JSON.stringify(locations)} />

      {lockedEmployee ? (
        <>
          <input type="hidden" name="employeeId" value={lockedEmployee._id} />
          <div className="bg-muted/50 rounded-lg border p-3">
            <p className="text-sm font-medium">{defaultEmployeeName ?? lockedEmployee.name}</p>
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="employeeId">Dolgozó</Label>
          <select
            id="employeeId"
            name="employeeId"
            className="border-input bg-background h-9 w-full rounded-md border px-2"
            required
            defaultValue={defaultEmployeeId ?? ''}
          >
            <option value="">Válasszon…</option>
            {employees.map((e) => (
              <option key={e._id} value={e._id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="start">Kezdet</Label>
        <Input id="start" name="start" type="datetime-local" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="end">Vége</Label>
        <Input id="end" name="end" type="datetime-local" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="kind">Típus</Label>
        <select
          id="kind"
          name="kind"
          className="border-input bg-background h-9 w-full rounded-md border px-2"
          defaultValue="shift"
        >
          <option value="shift">Műszak</option>
          <option value="off">Szabad</option>
          <option value="training">Képzés</option>
          <option value="field_work">Helyszíni munka</option>
          <option value="other">Egyéb</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Cím</Label>
        <Input id="title" name="title" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="locationLabel">Elsődleges helyszín címke (opcionális)</Label>
        <Input id="locationLabel" name="locationLabel" placeholder="pl. Építési helyszín" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="locationAddress">Cím (opcionális)</Label>
        <Input id="locationAddress" name="locationAddress" placeholder="Teljes cím" />
      </div>

      {/* Multiple Locations Section */}
      <div className="bg-muted/20 space-y-3 rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Több helyszín a műszak alatt</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddLocation(!showAddLocation)}
          >
            <PlusIcon className="mr-1 h-3.5 w-3.5" />
            Hozzáadás
          </Button>
        </div>

        {showAddLocation && (
          <div className="bg-background space-y-3 rounded-md border p-3">
            <div className="space-y-1">
              <Label htmlFor="new-loc-label" className="text-xs">
                Helyszín neve
              </Label>
              <Input
                id="new-loc-label"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="pl. Sakkmed Raktár"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-loc-address" className="text-xs">
                Cím (opcionális)
              </Label>
              <Input
                id="new-loc-address"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Teljes cím"
                className="h-8 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="new-loc-start" className="text-xs">
                  Kezdet
                </Label>
                <Input
                  id="new-loc-start"
                  type="datetime-local"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-loc-end" className="text-xs">
                  Vége
                </Label>
                <Input
                  id="new-loc-end"
                  type="datetime-local"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddLocation(false)}
                className="h-8 text-xs"
              >
                Mégse
              </Button>
              <Button type="button" size="sm" onClick={handleAddLocation} className="h-8 text-xs">
                Hozzáadás
              </Button>
            </div>
          </div>
        )}

        {locations.length === 0 ? (
          <p className="text-muted-foreground py-2 text-center text-xs">
            Nincs még hozzáadva egyedi helyszín.
          </p>
        ) : (
          <div className="space-y-2">
            {locations.map((loc, idx) => (
              <div
                key={idx}
                className="bg-background flex items-start justify-between rounded-md border p-2 text-xs"
              >
                <div className="space-y-0.5">
                  <p className="font-semibold">{loc.label}</p>
                  {loc.address && <p className="text-muted-foreground">{loc.address}</p>}
                  <p className="text-muted-foreground font-mono">
                    {loc.start.replace('T', ' ')} – {loc.end.replace('T', ' ')}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveLocation(idx)}
                  className="text-destructive hover:text-destructive/80 h-6 w-6"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button type="submit" loading={pending} disabled={pending}>
        {pending ? 'Mentés…' : 'Létrehozás'}
      </Button>
    </form>
  );
}
