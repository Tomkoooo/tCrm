'use client';

import { useState } from 'react';
import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { EntitySheet } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HrScheduleCalendar, type CalendarEvent } from '../../_components/hr-schedule-calendar';
import { submitMyRequestAction, cancelMyRequestAction } from '../actions';
import type { HrFormState } from '../../_components/form-utils';

type MyRequest = {
  _id: string;
  type: string;
  status: string;
  startLabel: string;
  endLabel: string;
};

export function MyHrClient({
  employeeName,
  companyName,
  initialEvents,
  requests,
}: {
  employeeName: string;
  companyName: string;
  initialEvents: CalendarEvent[];
  requests: MyRequest[];
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [requestType, setRequestType] = useState<'holiday' | 'sick_leave' | 'schedule_change'>(
    'holiday'
  );

  return (
    <div className="flex flex-col gap-6" data-testid="my-hr-schedule">
      <p className="text-muted-foreground text-sm">
        {employeeName} · {companyName}
      </p>

      <div className="flex gap-2">
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          Új kérelem
        </Button>
      </div>

      <HrScheduleCalendar mode="self" initialEvents={initialEvents} />

      <section>
        <h2 className="mb-2 text-lg font-semibold">Kérelmeim</h2>
        <ul className="divide-border divide-y text-sm">
          {requests.map((r) => (
            <li key={r._id} className="flex items-center justify-between py-2">
              <span>
                {r.type} — {r.status} ({r.startLabel} – {r.endLabel})
              </span>
              {r.status === 'Függő' && <CancelRequestButton requestId={r._id} />}
            </li>
          ))}
          {requests.length === 0 && <li className="text-muted-foreground py-2">Nincs kérelem.</li>}
        </ul>
      </section>

      <EntitySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Új kérelem"
        description="Szabadság, betegszabadság vagy beosztás módosítás."
        mode="create"
      >
        <RequestForm
          requestType={requestType}
          onTypeChange={setRequestType}
          onSuccess={() => setSheetOpen(false)}
        />
      </EntitySheet>
    </div>
  );
}

function RequestForm({
  requestType,
  onTypeChange,
  onSuccess,
}: {
  requestType: 'holiday' | 'sick_leave' | 'schedule_change';
  onTypeChange: (t: 'holiday' | 'sick_leave' | 'schedule_change') => void;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(submitMyRequestAction, {
    success: false,
  } as HrFormState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.refresh();
      onSuccess?.();
    } else if (state.message) toast.error(state.message);
  }, [state, router, onSuccess]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label>Típus</Label>
        <select
          className="border-input bg-background h-9 w-full rounded-md border px-2"
          value={requestType}
          onChange={(e) =>
            onTypeChange(e.target.value as 'holiday' | 'sick_leave' | 'schedule_change')
          }
        >
          <option value="holiday">Szabadság</option>
          <option value="sick_leave">Betegszabadság</option>
          <option value="schedule_change">Beosztás módosítás</option>
        </select>
      </div>
      <input type="hidden" name="type" value={requestType} />

      {(requestType === 'holiday' || requestType === 'sick_leave') && (
        <>
          <div className="space-y-2">
            <Label htmlFor="startDate">Kezdet</Label>
            <Input id="startDate" name="startDate" type="date" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">Vége</Label>
            <Input id="endDate" name="endDate" type="date" required />
          </div>
          {requestType === 'sick_leave' && (
            <div className="space-y-2">
              <Label htmlFor="sickPayAmount">Táppénz (HUF, opcionális)</Label>
              <Input id="sickPayAmount" name="sickPayAmount" type="number" min={0} />
            </div>
          )}
        </>
      )}

      {requestType === 'schedule_change' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="proposedStart">Javasolt kezdet</Label>
            <Input id="proposedStart" name="proposedStart" type="datetime-local" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proposedEnd">Javasolt vége</Label>
            <Input id="proposedEnd" name="proposedEnd" type="datetime-local" required />
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="reason">Indoklás</Label>
        <Input id="reason" name="reason" />
      </div>

      <Button type="submit" loading={pending} disabled={pending}>
        Beküldés
      </Button>
    </form>
  );
}

function CancelRequestButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={async () => {
        const res = await cancelMyRequestAction(requestId);
        if (res.success) {
          toast.success(res.message);
          router.refresh();
        } else toast.error(res.message);
      }}
    >
      Visszavonás
    </Button>
  );
}
