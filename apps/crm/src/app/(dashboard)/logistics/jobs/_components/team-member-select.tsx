'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GroupedMultiSelect, type GroupedSelectGroup } from '@crm/ui';
import { searchEmployeesGroupedAction, type GroupedEmployeeGroup } from '@/lib/employee-search';

function mapGroups(groups: GroupedEmployeeGroup[]): GroupedSelectGroup[] {
  return groups.map((g) => ({
    roleKey: g.roleKey,
    roleName: g.roleName,
    options: g.options,
  }));
}

function labelsFromGroups(
  groups: GroupedSelectGroup[],
  prev: Record<string, string>
): Record<string, string> {
  const next = { ...prev };
  for (const group of groups) {
    for (const opt of group.options) {
      next[opt.value] = opt.label;
    }
  }
  return next;
}

/** Assign HR people (employees) to a logistics pickup. */
export function TeamMemberSelect({
  selected,
  onChange,
  onLabels,
  disabled,
}: {
  warehouseId?: string;
  selected: string[];
  onChange: (ids: string[], labels: Record<string, string>) => void;
  onLabels?: (labels: Record<string, string>) => void;
  disabled?: boolean;
}) {
  const [groups, setGroups] = useState<GroupedSelectGroup[]>([]);
  const [labelCache, setLabelCache] = useState<Record<string, string>>({});
  const onLabelsRef = useRef(onLabels);
  onLabelsRef.current = onLabels;

  const loadSearch = useCallback(async (query: string) => {
    const result = await searchEmployeesGroupedAction(query, { limit: 50 });
    const mapped = mapGroups(result.groups);
    setGroups(mapped);
    setLabelCache((prev) => {
      const next = labelsFromGroups(mapped, prev);
      onLabelsRef.current?.(next);
      return next;
    });
  }, []);

  useEffect(() => {
    void loadSearch('');
  }, [loadSearch]);

  return (
    <GroupedMultiSelect
      groups={groups}
      selected={selected}
      onChange={(ids) => {
        const labels = labelsFromGroups(groups, labelCache);
        setLabelCache(labels);
        onChange(ids, labels);
      }}
      onSearch={loadSearch}
      placeholder="Keresés név vagy e-mail…"
      disabled={disabled}
      resolveLabel={(id) => labelCache[id]}
    />
  );
}
