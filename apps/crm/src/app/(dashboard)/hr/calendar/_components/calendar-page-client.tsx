'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, EntitySheet, cn } from '@crm/ui';
import { HrCalendar, type HrCalendarEvent } from '../../_components/hr-calendar';
import { RosterShiftForm } from '../../_components/roster-shift-form';

const selectClassName = cn(
  'border-input bg-background flex h-9 min-w-[12rem] rounded-md border px-3 py-1 text-sm shadow-xs'
);

export function CalendarPageClient({
  companies,
  employees,
  canWrite,
}: {
  companies: Array<{ id: string; name: string }>;
  employees: Array<{ id: string; name: string; scheduleMode: string; companyId: string }>;
  canWrite: boolean;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const companyId = sp.get('companyId') ?? companies[0]?.id ?? '';
  const employeeId = sp.get('employeeId') ?? '';

  const filteredEmployees = useMemo(
    () => employees.filter((e) => e.companyId === companyId),
    [employees, companyId]
  );

  const selected = filteredEmployees.find((e) => e.id === employeeId);
  const canEditRoster = canWrite && selected?.scheduleMode === 'roster';

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<HrCalendarEvent | null>(null);

  function setQuery(next: { companyId?: string; employeeId?: string }) {
    const params = new URLSearchParams();
    const c = next.companyId ?? companyId;
    if (c) params.set('companyId', c);
    const e = next.employeeId !== undefined ? next.employeeId : employeeId;
    if (e) params.set('employeeId', e);
    router.push(`/hr/calendar?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs">Cég</label>
          <select
            className={selectClassName}
            value={companyId}
            onChange={(e) => setQuery({ companyId: e.target.value, employeeId: '' })}
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs">Dolgozó</label>
          <select
            className={selectClassName}
            value={employeeId}
            onChange={(e) => setQuery({ employeeId: e.target.value })}
          >
            <option value="">Összes (csoport)</option>
            {filteredEmployees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
                {e.scheduleMode === 'roster' ? ' · roster' : ''}
              </option>
            ))}
          </select>
        </div>
        {canEditRoster ? (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditing(null);
              setSheetOpen(true);
            }}
          >
            Új műszak
          </Button>
        ) : null}
        <Button asChild variant="outline" size="sm">
          <Link href="/hr/leave">Szabadság</Link>
        </Button>
      </div>

      {!companyId ? (
        <p className="text-muted-foreground text-sm">Válassz céget a naptárhoz.</p>
      ) : (
        <HrCalendar
          mode="hr"
          companyId={companyId}
          employeeId={employeeId || undefined}
          resources={filteredEmployees.map((e) => ({ id: e.id, title: e.name }))}
          editable={canEditRoster}
          onSelectEvent={(ev) => {
            setEditing(ev);
            setSheetOpen(true);
          }}
        />
      )}

      {canEditRoster && employeeId ? (
        <EntitySheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title={editing ? 'Műszak szerkesztése' : 'Új műszak'}
          size="md"
          mode={editing ? 'edit' : 'create'}
        >
          <RosterShiftForm
            employeeId={employeeId}
            event={editing}
            onDone={() => setSheetOpen(false)}
          />
        </EntitySheet>
      ) : null}
    </div>
  );
}
