'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { createTeamAction, searchEmployeesForTeamAction } from '../actions';
import type { HrFormState } from '../../_components/form-utils';

const TEAM_TYPES = [
  { value: '', label: '—' },
  { value: 'builders', label: 'Építőcsapat' },
  { value: 'drivers', label: 'Sofőrök' },
  { value: 'mixed', label: 'Vegyes' },
  { value: 'other', label: 'Egyéb' },
];

export function TeamForm({
  companies,
  defaultCompanyId,
  initial,
  onSuccess,
}: {
  companies: { _id: string; name: string }[];
  defaultCompanyId?: string;
  initial?: {
    name: string;
    slug: string;
    companyId: string;
    leaderEmployeeId: string;
    memberEmployeeIds: string[];
    teamType?: string;
    isActive: boolean;
  };
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const actionFn = initial ? undefined : createTeamAction;
  const [state, action, pending] = useActionState(actionFn ?? createTeamAction, {
    success: false,
  } as HrFormState);

  const [companyId, setCompanyId] = useState(initial?.companyId ?? defaultCompanyId ?? '');
  const [employeeOptions, setEmployeeOptions] = useState<Array<{ _id: string; label: string }>>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    initial?.memberEmployeeIds ?? []
  );

  useEffect(() => {
    if (!companyId) {
      setEmployeeOptions([]);
      return;
    }
    void searchEmployeesForTeamAction(companyId, '').then(setEmployeeOptions);
  }, [companyId]);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message ?? 'Mentve.');
      if (state.id) router.push(`/accounting/teams/${state.id}`);
      router.refresh();
      onSuccess?.();
    } else if (state.message) toast.error(state.message);
  }, [state, router, onSuccess]);

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="companyId">Cég</Label>
        <select
          id="companyId"
          name="companyId"
          className="border-input bg-background h-9 w-full rounded-md border px-2"
          required
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          disabled={Boolean(initial)}
        >
          <option value="">Válasszon…</option>
          {companies.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Név</Label>
          <Input id="name" name="name" required defaultValue={initial?.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" required defaultValue={initial?.slug} />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="leaderEmployeeId">Csapatvezető</Label>
          <select
            id="leaderEmployeeId"
            name="leaderEmployeeId"
            className="border-input bg-background h-9 w-full rounded-md border px-2"
            required
            defaultValue={initial?.leaderEmployeeId ?? ''}
          >
            <option value="">Válasszon…</option>
            {employeeOptions.map((e) => (
              <option key={e._id} value={e._id}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="teamType">Típus</Label>
          <select
            id="teamType"
            name="teamType"
            className="border-input bg-background h-9 w-full rounded-md border px-2"
            defaultValue={initial?.teamType ?? ''}
          >
            {TEAM_TYPES.map((t) => (
              <option key={t.value || 'none'} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Csapattagok</Label>
        <div className="max-h-48 overflow-y-auto rounded-md border p-2">
          {employeeOptions.length === 0 ? (
            <p className="text-muted-foreground text-sm">Válasszon céget a dolgozók listájához.</p>
          ) : (
            employeeOptions.map((e) => (
              <label key={e._id} className="flex items-center gap-2 py-1 text-sm">
                <Checkbox
                  checked={selectedMembers.includes(e._id)}
                  onCheckedChange={() => toggleMember(e._id)}
                />
                {e.label}
              </label>
            ))
          )}
        </div>
        {selectedMembers.map((id) => (
          <input key={id} type="hidden" name="memberEmployeeIds" value={id} />
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox name="isActive" defaultChecked={initial?.isActive ?? true} />
        Aktív csapat
      </label>
      <Button type="submit" loading={pending} disabled={pending}>
        {initial ? 'Mentés' : 'Létrehozás'}
      </Button>
    </form>
  );
}
