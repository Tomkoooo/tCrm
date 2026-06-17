'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PlusIcon, TrashIcon } from 'lucide-react';
import { formatHrDateTimeLocal, toCalendarDate } from '@crm/lib';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { deleteScheduleEntryAction, updateScheduleEntryFormAction } from '../actions';
import type { HrFormState } from '../../_components/form-utils';
import type { CalendarEvent } from '../../_components/hr-schedule-calendar';

export function EditScheduleForm({
  event,
  onSuccess,
  onDeleted,
}: {
  event: CalendarEvent;
  onSuccess?: () => void;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateScheduleEntryFormAction, {
    success: false,
  } as HrFormState);
  const [deletePending, startDelete] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const startDate = toCalendarDate(event.start);
  const endDate = toCalendarDate(event.end);

  // Pre-populate locations from event
  const [locations, setLocations] = useState<
    Array<{ label: string; address?: string; start: string; end: string }>
  >(() => {
    const rawLocs = (event as any).locations ?? [];
    return rawLocs.map((loc: any) => ({
      label: loc.label,
      address: loc.address,
      start: formatHrDateTimeLocal(toCalendarDate(loc.start)),
      end: formatHrDateTimeLocal(toCalendarDate(loc.end)),
    }));
  });

  const [newLabel, setNewLabel] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [showAddLocation, setShowAddLocation] = useState(false);

  useEffect(() => {
    if (state.success) {
      toast.success('Beosztás frissítve.');
      router.refresh();
      onSuccess?.();
    } else if (state.message) toast.error(state.message);
  }, [state, router, onSuccess]);

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startDelete(async () => {
      const result = await deleteScheduleEntryAction(event.id);
      if (result.success) {
        toast.success('Beosztás törölve.');
        router.refresh();
        onDeleted?.();
      } else {
        toast.error(result.message ?? 'Törlés sikertelen.');
        setConfirmDelete(false);
      }
    });
  };

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
      <input type="hidden" name="id" value={event.id} />
      <input type="hidden" name="locationsJson" value={JSON.stringify(locations)} />

      {event.employeeName ? (
        <div className="bg-muted/50 rounded-lg border p-3">
          <p className="text-sm font-medium">{event.employeeName}</p>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="edit-start">Kezdet</Label>
        <Input
          id="edit-start"
          name="start"
          type="datetime-local"
          defaultValue={formatHrDateTimeLocal(startDate)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-end">Vége</Label>
        <Input
          id="edit-end"
          name="end"
          type="datetime-local"
          defaultValue={formatHrDateTimeLocal(endDate)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-kind">Típus</Label>
        <select
          id="edit-kind"
          name="kind"
          className="border-input bg-background h-9 w-full rounded-md border px-2"
          defaultValue={event.kind ?? 'shift'}
        >
          <option value="shift">Műszak</option>
          <option value="off">Szabad</option>
          <option value="training">Képzés</option>
          <option value="field_work">Helyszíni munka</option>
          <option value="other">Egyéb</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-title">Cím</Label>
        <Input id="edit-title" name="title" defaultValue={event.title} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-locationLabel">Elsődleges helyszín címke (opcionális)</Label>
        <Input
          id="edit-locationLabel"
          name="locationLabel"
          defaultValue={(event as any).locationLabel ?? ''}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-locationAddress">Cím (opcionális)</Label>
        <Input
          id="edit-locationAddress"
          name="locationAddress"
          defaultValue={(event as any).locationAddress ?? ''}
        />
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          type="submit"
          loading={pending}
          disabled={pending || deletePending}
          className="flex-1"
        >
          Mentés
        </Button>
        <Button
          type="button"
          variant={confirmDelete ? 'destructive' : 'outline'}
          onClick={handleDelete}
          disabled={pending || deletePending}
        >
          {confirmDelete ? 'Biztosan törli?' : 'Törlés'}
        </Button>
      </div>
    </form>
  );
}
