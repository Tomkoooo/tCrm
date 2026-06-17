'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { updateTeamAction, searchEmployeesForTeamAction } from '../actions';
import type { HrFormState } from '../../_components/form-utils';

const TEAM_TYPES = [
  { value: '', label: '—' },
  { value: 'builders', label: 'Építőcsapat' },
  { value: 'drivers', label: 'Sofőrök' },
  { value: 'mixed', label: 'Vegyes' },
  { value: 'other', label: 'Egyéb' },
];

export function EditTeamForm({
  teamId,
  initial,
}: {
  teamId: string;
  companies?: { _id: string; name: string }[];
  initial: {
    name: string;
    slug: string;
    companyId: string;
    leaderEmployeeId: string;
    memberEmployeeIds: string[];
    teamType?: string;
    isActive: boolean;
  };
}) {
  const router = useRouter();
  const bound = updateTeamAction.bind(null, teamId);
  const [state, action, pending] = useActionState(bound, { success: false } as HrFormState);

  const [employeeOptions, setEmployeeOptions] = useState<Array<{ _id: string; label: string }>>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(initial.memberEmployeeIds);

  useEffect(() => {
    void searchEmployeesForTeamAction(initial.companyId, '').then(setEmployeeOptions);
  }, [initial.companyId]);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message ?? 'Mentve.');
      router.refresh();
    } else if (state.message) toast.error(state.message);
  }, [state, router]);

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="companyId" value={initial.companyId} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Név</Label>
          <Input id="name" name="name" required defaultValue={initial.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" required defaultValue={initial.slug} />
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
            defaultValue={initial.leaderEmployeeId}
          >
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
            defaultValue={initial.teamType ?? ''}
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
          {employeeOptions.map((e) => (
            <label key={e._id} className="flex items-center gap-2 py-1 text-sm">
              <Checkbox
                checked={selectedMembers.includes(e._id)}
                onCheckedChange={() => toggleMember(e._id)}
              />
              {e.label}
            </label>
          ))}
        </div>
        {selectedMembers.map((id) => (
          <input key={id} type="hidden" name="memberEmployeeIds" value={id} />
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox name="isActive" defaultChecked={initial.isActive} />
        Aktív csapat
      </label>
      <Button type="submit" loading={pending} disabled={pending}>
        Mentés
      </Button>
    </form>
  );
}
