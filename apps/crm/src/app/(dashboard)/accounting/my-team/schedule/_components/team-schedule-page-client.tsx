'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EntitySheet } from '@crm/ui';
import { Button } from '@/components/ui/button';
import {
  HrScheduleCalendar,
  type CalendarEvent,
  type EmployeeCalendarMeta,
} from '../../../_components/hr-schedule-calendar';
import { CreateScheduleForm } from '../../../schedule/_components/create-schedule-form';
import { BulkScheduleForm } from '../../../schedule/_components/bulk-schedule-form';
import { EditScheduleForm } from '../../../schedule/_components/edit-schedule-form';

type EmployeeOption = { _id: string; name: string; companyId: string; label: string };
type CompanyOption = { _id: string; name: string };

export function TeamSchedulePageClient({
  editable,
  employees,
  employeeLegend,
  companies,
  initialEvents,
  initialCompanyId,
}: {
  editable: boolean;
  employees: EmployeeOption[];
  employeeLegend: EmployeeCalendarMeta[];
  companies: CompanyOption[];
  initialEvents: CalendarEvent[];
  initialCompanyId?: string;
  initialEmployeeId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);

  const companyId = searchParams.get('companyId') ?? initialCompanyId ?? '';

  const filteredEmployees = useMemo(() => {
    if (!companyId) return employees;
    return employees.filter((e) => e.companyId === companyId);
  }, [employees, companyId]);

  const updateFilter = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('companyId', value);
    else params.delete('companyId');
    router.push(`/accounting/my-team/schedule?${params.toString()}`);
  };

  const formEmployees = filteredEmployees.map((e) => ({ _id: e._id, name: e.label }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Cég</span>
          <select
            className="border-input bg-background h-9 rounded-md border px-2"
            value={companyId}
            onChange={(e) => updateFilter(e.target.value)}
          >
            <option value="">Összes cég</option>
            {companies.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {editable && (
          <>
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              Új bejegyzés
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
              Tömeges műszak
            </Button>
          </>
        )}
      </div>

      <HrScheduleCalendar
        mode="team"
        companyId={companyId || undefined}
        initialEvents={initialEvents}
        employeeLegend={employeeLegend}
        editable={editable}
        onSelectEvent={setEditEvent}
      />

      <EntitySheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Új beosztás"
        description="Csapattag beosztása."
        mode="create"
      >
        <CreateScheduleForm employees={formEmployees} onSuccess={() => setCreateOpen(false)} />
      </EntitySheet>

      <EntitySheet
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title="Tömeges műszak"
        description="Több csapattag azonos műszakja."
        mode="create"
      >
        <BulkScheduleForm employees={formEmployees} onSuccess={() => setBulkOpen(false)} />
      </EntitySheet>

      <EntitySheet
        open={Boolean(editEvent)}
        onOpenChange={(open) => !open && setEditEvent(null)}
        title="Beosztás szerkesztése"
        description={editEvent?.employeeName ?? editEvent?.title}
        mode="edit"
      >
        {editEvent ? (
          <EditScheduleForm event={editEvent} onSuccess={() => setEditEvent(null)} />
        ) : null}
      </EntitySheet>
    </div>
  );
}
