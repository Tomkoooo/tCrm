'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EntitySheet } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { HrScheduleCalendar, type CalendarEvent } from '../../_components/hr-schedule-calendar';
import { CreateScheduleForm } from './create-schedule-form';
import { BulkScheduleForm } from './bulk-schedule-form';

type EmployeeOption = { _id: string; name: string; companyId: string; label: string };
type CompanyOption = { _id: string; name: string };

export function SchedulePageClient({
  editable,
  employees,
  companies,
  initialEvents,
  initialEmployeeId,
  initialCompanyId,
}: {
  editable: boolean;
  employees: EmployeeOption[];
  companies: CompanyOption[];
  initialEvents: CalendarEvent[];
  initialEmployeeId?: string;
  initialCompanyId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const companyId = searchParams.get('companyId') ?? initialCompanyId ?? '';
  const employeeIdParam = searchParams.get('employeeId') ?? initialEmployeeId ?? '';

  const filteredEmployees = useMemo(() => {
    if (!companyId) return employees;
    return employees.filter((e) => e.companyId === companyId);
  }, [employees, companyId]);

  const employeeId = filteredEmployees.some((e) => e._id === employeeIdParam)
    ? employeeIdParam
    : '';

  const updateFilter = (key: 'companyId' | 'employeeId', value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key === 'companyId') params.delete('employeeId');
    router.push(`/accounting/schedule?${params.toString()}`);
  };

  const formEmployees = filteredEmployees.map((e) => ({ _id: e._id, name: e.label }));

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
            className="border-input bg-background h-9 min-w-[12rem] rounded-md border px-2"
            value={employeeId}
            onChange={(e) => updateFilter('employeeId', e.target.value)}
            disabled={!companyId && filteredEmployees.length > 20}
            title={
              !companyId
                ? 'Cég kiválasztása ajánlott — dolgozói rekord cégenként külön.'
                : undefined
            }
          >
            <option value="">Összes</option>
            {filteredEmployees.map((e) => (
              <option key={e._id} value={e._id}>
                {e.label}
              </option>
            ))}
          </select>
        </label>
        {editable && (
          <>
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              Új beosztás
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
              Tömeges beosztás
            </Button>
          </>
        )}
      </div>
      {!companyId ? (
        <p className="text-muted-foreground text-sm">
          Válasszon céget a dolgozók szűréséhez — minden céghez külön dolgozói rekord tartozik
          (külön beosztás és szabadság).
        </p>
      ) : null}
      <HrScheduleCalendar
        employeeId={employeeId || undefined}
        companyId={companyId || undefined}
        initialEvents={initialEvents}
      />
      {editable && (
        <>
          <EntitySheet
            open={createOpen}
            onOpenChange={setCreateOpen}
            title="Új beosztás"
            mode="create"
          >
            <CreateScheduleForm employees={formEmployees} onSuccess={() => setCreateOpen(false)} />
          </EntitySheet>
          <EntitySheet
            open={bulkOpen}
            onOpenChange={setBulkOpen}
            title="Tömeges beosztás"
            description="Műszakok alkalmazása több napra és dolgozóra — szabadság napok automatikusan kihagyva."
            mode="create"
          >
            <BulkScheduleForm employees={formEmployees} onSuccess={() => setBulkOpen(false)} />
          </EntitySheet>
        </>
      )}
    </div>
  );
}
