'use client';

import { useActionState, useState } from 'react';
import { cn, Button, Input, Label, Textarea, SearchAutocomplete, type SearchItem } from '@crm/ui';
import {
  updateEmployeeAction,
  searchUsersForEmployeeLinkAction,
  type HrFormState,
} from '../../actions';

const initial: HrFormState = { success: false };

const selectClassName = cn(
  'border-input bg-background ring-offset-background focus-visible:ring-ring',
  'flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none',
  'focus-visible:ring-2 focus-visible:ring-offset-2'
);

export function EditEmployeeForm({
  employee,
  companies,
  linkedUserLabel,
}: {
  employee: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    userId?: string;
    companyId: string;
    scheduleMode: 'logistics' | 'roster';
    calendarColor?: string;
    isActive: boolean;
    notes?: string;
  };
  companies: Array<{ id: string; name: string }>;
  linkedUserLabel?: string;
}) {
  const [state, action, pending] = useActionState(updateEmployeeAction, initial);
  const [userId, setUserId] = useState(employee.userId ?? '');
  const [userDisplay, setUserDisplay] = useState(linkedUserLabel ?? '');

  async function onSearch(query: string): Promise<SearchItem[]> {
    const rows = await searchUsersForEmployeeLinkAction(query);
    return rows.map((r) => ({
      value: r.id,
      label: r.label,
      sublabel: r.sublabel,
    }));
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={employee.id} />
      <input type="hidden" name="userId" value={userId} />
      {state.message ? (
        <p
          className={
            state.success ? 'text-sm text-green-700 dark:text-green-400' : 'text-sm text-red-600'
          }
          role={state.success ? 'status' : 'alert'}
        >
          {state.message}
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor="companyId">Cég</Label>
        <select
          id="companyId"
          name="companyId"
          className={selectClassName}
          defaultValue={employee.companyId}
          required
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">
          Név <span className="text-destructive">*</span>
        </Label>
        <Input id="name" name="name" required defaultValue={employee.name} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="scheduleMode">Beosztás mód</Label>
        <select
          id="scheduleMode"
          name="scheduleMode"
          className={selectClassName}
          defaultValue={employee.scheduleMode}
        >
          <option value="logistics">Logisztika (feladatok)</option>
          <option value="roster">Roster (kézi műszak)</option>
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="calendarColor">Naptár szín (opcionális hex)</Label>
        <Input
          id="calendarColor"
          name="calendarColor"
          defaultValue={employee.calendarColor ?? ''}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" defaultValue={employee.email ?? ''} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">Telefon</Label>
        <Input id="phone" name="phone" defaultValue={employee.phone ?? ''} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>CRM fiók (opcionális)</Label>
        <SearchAutocomplete
          placeholder="Felhasználó keresése…"
          onSearch={onSearch}
          onSelect={(item) => {
            setUserId(item.value);
            setUserDisplay(item.sublabel ? `${item.label} · ${item.sublabel}` : item.label);
          }}
        />
        {userDisplay || userId ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-muted-foreground text-xs">
              Kiválasztva:{' '}
              <span className="text-foreground font-medium">{userDisplay || userId}</span>
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setUserId('');
                setUserDisplay('');
              }}
            >
              Leválasztás
            </Button>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="isActive">Státusz</Label>
        <select
          id="isActive"
          name="isActive"
          className={selectClassName}
          defaultValue={employee.isActive ? 'true' : 'false'}
        >
          <option value="true">Aktív</option>
          <option value="false">Inaktív</option>
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Megjegyzés</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={employee.notes ?? ''} />
      </div>
      <Button type="submit" loading={pending} disabled={pending}>
        Mentés
      </Button>
    </form>
  );
}
