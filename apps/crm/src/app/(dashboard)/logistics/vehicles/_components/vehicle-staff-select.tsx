'use client';

import { useCallback, useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { GroupedMultiSelect, type GroupedSelectGroup } from '@/components/ui/grouped-multi-select';
import { searchUsersGroupedAction, type GroupedUserGroup } from '@/lib/user-grouped-search';

export function VehicleStaffSelect({ initialSelected }: { initialSelected: string[] }) {
  const [selected, setSelected] = useState(initialSelected);
  const [groups, setGroups] = useState<GroupedSelectGroup[]>([]);
  const [labelCache, setLabelCache] = useState<Record<string, string>>({});

  const mapGroups = (g: GroupedUserGroup[]): GroupedSelectGroup[] =>
    g.map((group) => ({
      roleKey: group.roleKey,
      roleName: group.roleName,
      options: group.options,
    }));

  const loadSearch = useCallback(async (query: string) => {
    const result = await searchUsersGroupedAction(query, { limit: 50 });
    setGroups(mapGroups(result.groups));
    setLabelCache((prev) => {
      const next = { ...prev };
      for (const group of result.groups) {
        for (const opt of group.options) {
          next[opt.value] = opt.label;
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    void loadSearch('');
  }, [loadSearch]);

  useEffect(() => {
    setSelected(initialSelected);
  }, [initialSelected]);

  return (
    <div className="flex flex-col gap-2 md:col-span-2">
      <Label>Jogosult felhasználók (vezetés / karbantartás)</Label>
      <p className="text-muted-foreground text-xs">
        Ezek a felhasználók incidenseket jelenthetnek be ehhez a járműhöz.
      </p>
      {selected.map((id) => (
        <input key={id} type="hidden" name="allowedUserIds" value={id} />
      ))}
      <GroupedMultiSelect
        groups={groups}
        selected={selected}
        onChange={setSelected}
        onSearch={loadSearch}
        placeholder="Keresés név vagy e-mail…"
        resolveLabel={(id) => labelCache[id]}
      />
    </div>
  );
}
