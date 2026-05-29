'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EntitySheet } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { HrScheduleCalendar, type CalendarEvent } from '../../_components/hr-schedule-calendar';
import { CreateScheduleForm } from './create-schedule-form';

type Option = { _id: string; name: string };

export function SchedulePageClient({
  editable,
  employees,
  companies,
  initialEvents,
  initialEmployeeId,
  initialCompanyId,
}: {
  editable: boolean;
  employees: Option[];
  companies: Option[];
  initialEvents: CalendarEvent[];
  initialEmployeeId?: string;
  initialCompanyId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);

  const employeeId = searchParams.get('employeeId') ?? initialEmployeeId ?? '';
  const companyId = searchParams.get('companyId') ?? initialCompanyId ?? '';

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/accounting/schedule?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Cég
          <select
            className="border-input bg-background h-9 rounded-md border px-2"
            value={companyId}
            onChange={(e) => updateFilter('companyId', e.target.value)}
          >
            <option value="">Összes</option>
            {companies.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Dolgozó
          <select
            className="border-input bg-background h-9 rounded-md border px-2"
            value={employeeId}
            onChange={(e) => updateFilter('employeeId', e.target.value)}
          >
            <option value="">Összes</option>
            {employees.map((e) => (
              <option key={e._id} value={e._id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        {editable && (
          <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
            Új beosztás
          </Button>
        )}
      </div>
      <HrScheduleCalendar
        employeeId={employeeId || undefined}
        companyId={companyId || undefined}
        initialEvents={initialEvents}
      />
      {editable && (
        <EntitySheet
          open={createOpen}
          onOpenChange={setCreateOpen}
          title="Új beosztás"
          mode="create"
        >
          <CreateScheduleForm employees={employees} onSuccess={() => setCreateOpen(false)} />
        </EntitySheet>
      )}
    </div>
  );
}
