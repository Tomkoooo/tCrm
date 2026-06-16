'use client';

import { useState, useTransition } from 'react';
import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { EntitySheet } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HrScheduleCalendar, type CalendarEvent } from '../../_components/hr-schedule-calendar';
import { submitMyRequestAction, cancelMyRequestAction } from '../actions';
import { setActiveEmployeeAction } from '../../onboarding/actions';
import type { HrFormState } from '../../_components/form-utils';
import type { ShiftOption } from '../_lib/shift-options';

type Membership = { employeeId: string; label: string };

type MyRequest = {
  _id: string;
  type: string;
  status: string;
  startLabel: string;
  endLabel: string;
  periodLabel: string;
};

export function MyHrClient({
  employeeId,
  employeeName,
  companyName,
  memberships,
  initialEvents,
  shiftOptions,
  requests,
}: {
  employeeId: string;
  employeeName: string;
  companyName: string;
  memberships: Membership[];
  initialEvents: CalendarEvent[];
  shiftOptions: ShiftOption[];
  requests: MyRequest[];
}) {
  const router = useRouter();
  const [pendingSwitch, startSwitch] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [requestType, setRequestType] = useState<'holiday' | 'sick_leave' | 'schedule_change'>(
    'holiday'
  );

  const onSwitchCompany = (nextEmployeeId: string) => {
    if (nextEmployeeId === employeeId) return;
    startSwitch(async () => {
      const res = await setActiveEmployeeAction(nextEmployeeId);
      if (res.success) {
        router.push(`/accounting/my?employeeId=${nextEmployeeId}`);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <div className="flex flex-col gap-6" data-testid="my-hr-schedule">
      <div className="flex flex-wrap items-end gap-3">
        <p className="text-muted-foreground text-sm">
          {employeeName} · {companyName}
        </p>
        {memberships.length > 1 && (
          <label className="ml-auto flex flex-col gap-1 text-sm">
            Aktív cég
            <select
              className="border-input bg-background h-9 min-w-[200px] rounded-md border px-2"
              value={employeeId}
              disabled={pendingSwitch}
              onChange={(e) => onSwitchCompany(e.target.value)}
            >
              {memberships.map((m) => (
                <option key={m.employeeId} value={m.employeeId}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

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
                {r.type} — {r.status}
                {r.periodLabel !== '—' ? ` (${r.periodLabel})` : ''}
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
          employeeId={employeeId}
          requestType={requestType}
          shiftOptions={shiftOptions}
          onTypeChange={setRequestType}
          onSuccess={() => setSheetOpen(false)}
        />
      </EntitySheet>
    </div>
  );
}

function RequestForm({
  employeeId,
  requestType,
  shiftOptions,
  onTypeChange,
  onSuccess,
}: {
  employeeId: string;
  requestType: 'holiday' | 'sick_leave' | 'schedule_change';
  shiftOptions: ShiftOption[];
  onTypeChange: (t: 'holiday' | 'sick_leave' | 'schedule_change') => void;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(submitMyRequestAction, {
    success: false,
  } as HrFormState);
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [proposedStart, setProposedStart] = useState('');
  const [proposedEnd, setProposedEnd] = useState('');

  const onShiftChange = (shiftId: string) => {
    setSelectedShiftId(shiftId);
    const shift = shiftOptions.find((s) => s.id === shiftId);
    if (shift) {
      setProposedStart(shift.proposedStart);
      setProposedEnd(shift.proposedEnd);
    } else {
      setProposedStart('');
      setProposedEnd('');
    }
  };

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.refresh();
      onSuccess?.();
    } else if (state.message) toast.error(state.message);
  }, [state, router, onSuccess]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="activeEmployeeId" value={employeeId} />
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
          {shiftOptions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nincs módosítható műszak a naptárban — kérjen HR-től beosztást, vagy válasszon másik
              hónapot a naptárban.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="scheduleEntryId">Módosítandó műszak</Label>
                <select
                  id="scheduleEntryId"
                  name="scheduleEntryId"
                  className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                  value={selectedShiftId}
                  onChange={(e) => onShiftChange(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Válasszon műszakot…
                  </option>
                  {shiftOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <p className="text-muted-foreground text-xs">
                  A jelenlegi időpont alapértelmezés — módosítsa, ha más időre szeretné.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="proposedStart">Javasolt kezdet</Label>
                <Input
                  id="proposedStart"
                  name="proposedStart"
                  type="datetime-local"
                  value={proposedStart}
                  onChange={(e) => setProposedStart(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proposedEnd">Javasolt vége</Label>
                <Input
                  id="proposedEnd"
                  name="proposedEnd"
                  type="datetime-local"
                  value={proposedEnd}
                  onChange={(e) => setProposedEnd(e.target.value)}
                  required
                />
              </div>
            </>
          )}
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="reason">Indoklás</Label>
        <Input id="reason" name="reason" />
      </div>

      <Button
        type="submit"
        loading={pending}
        disabled={pending || (requestType === 'schedule_change' && shiftOptions.length === 0)}
      >
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
