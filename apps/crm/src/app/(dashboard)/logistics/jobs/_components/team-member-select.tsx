'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GroupedMultiSelect, type GroupedSelectGroup } from '@crm/ui';
import {
  getWarehouseAssignedUserIdsAction,
  searchUsersGroupedAction,
  type GroupedUserGroup,
} from '@/lib/user-grouped-search';

function mapGroups(groups: GroupedUserGroup[]): GroupedSelectGroup[] {
  return groups.map((g) => ({
    roleKey: g.roleKey,
    roleName: g.roleName,
    options: g.options,
  }));
}

export function TeamMemberSelect({
  warehouseId,
  selected,
  onChange,
  disabled,
}: {
  warehouseId: string;
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const [groups, setGroups] = useState<GroupedSelectGroup[]>([]);
  const [labelCache, setLabelCache] = useState<Record<string, string>>({});

  const loadSearch = useCallback(
    async (query: string) => {
      const result = await searchUsersGroupedAction(query, {
        warehouseId: warehouseId || undefined,
        limit: 50,
      });
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
    },
    [warehouseId]
  );

  useEffect(() => {
    void loadSearch('');
  }, [loadSearch]);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!warehouseId) return;
    void (async () => {
      const assigned = await getWarehouseAssignedUserIdsAction(warehouseId);
      if (assigned.length > 0) onChangeRef.current(assigned);
    })();
  }, [warehouseId]);

  return (
    <GroupedMultiSelect
      groups={groups}
      selected={selected}
      onChange={onChange}
      onSearch={loadSearch}
      placeholder="Keresés név vagy e-mail…"
      disabled={disabled}
      resolveLabel={(id) => labelCache[id]}
    />
  );
}
