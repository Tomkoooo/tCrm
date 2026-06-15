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

  const selectedEmployee = filteredEmployees.find((e) => e._id === employeeId);

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
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Cég</span>
          <select
            className="border-input bg-background h-9 rounded-md border px-2"
            value={companyId}
            onChange={(e) => updateFilter('companyId', e.target.value)}
          >
            <option value="">Összes cég</option>
            {companies.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Dolgozó</span>
          <select
            className="border-input bg-background h-9 min-w-[14rem] rounded-md border px-2"
            value={employeeId}
            onChange={(e) => updateFilter('employeeId', e.target.value)}
          >
            <option value="">Összes dolgozó</option>
            {filteredEmployees.map((e) => (
              <option key={e._id} value={e._id}>
                {e.label}
              </option>
            ))}
          </select>
        </label>

        {editable && (
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              Új beosztás
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setBulkOpen(true)}
              disabled={!employeeId}
              title={!employeeId ? 'Előbb válasszon dolgozót' : undefined}
            >
              Tömeges műszak
            </Button>
          </div>
        )}
      </div>

      {!companyId && (
        <p className="text-muted-foreground text-sm">
          Válasszon céget a dolgozók szűréséhez. Minden céghez külön dolgozói rekord tartozik.
        </p>
      )}
      {companyId && !employeeId && (
        <p className="text-muted-foreground text-sm">
          Válasszon dolgozót a naptárjának megtekintéséhez és tömeges műszak létrehozásához.
        </p>
      )}

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
            description="Egyetlen műszak vagy szabad nap rögzítése."
            mode="create"
          >
            <CreateScheduleForm employees={formEmployees} onSuccess={() => setCreateOpen(false)} />
          </EntitySheet>

          {selectedEmployee && (
            <EntitySheet
              open={bulkOpen}
              onOpenChange={setBulkOpen}
              title="Tömeges műszak"
              description="Műszakok létrehozása több napra egyszerre."
              mode="create"
            >
              <BulkScheduleForm
                employeeId={selectedEmployee._id}
                employeeName={selectedEmployee.label}
                onSuccess={() => setBulkOpen(false)}
              />
            </EntitySheet>
          )}
        </>
      )}
    </div>
  );
}
