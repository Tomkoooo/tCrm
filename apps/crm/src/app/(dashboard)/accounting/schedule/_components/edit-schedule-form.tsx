'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
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

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={event.id} />

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
        <Label htmlFor="edit-locationLabel">Helyszín címke</Label>
        <Input id="edit-locationLabel" name="locationLabel" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-locationAddress">Cím</Label>
        <Input id="edit-locationAddress" name="locationAddress" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-title">Cím</Label>
        <Input id="edit-title" name="title" defaultValue={event.title} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          type="submit"
          loading={pending}
          disabled={pending || deletePending}
          className="sm:flex-1"
        >
          {pending ? 'Mentés…' : 'Mentés'}
        </Button>
        <Button
          type="button"
          variant={confirmDelete ? 'destructive' : 'outline'}
          loading={deletePending}
          loadingText="Törlés…"
          disabled={pending || deletePending}
          onClick={handleDelete}
        >
          {confirmDelete ? 'Biztosan törli?' : 'Törlés'}
        </Button>
      </div>
      {confirmDelete && !deletePending ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
          Mégse
        </Button>
      ) : null}
    </form>
  );
}
