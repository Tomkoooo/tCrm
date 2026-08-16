'use client';

import { ChevronDownIcon } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@crm/ui';
import { Badge } from '@crm/ui';
import { cn } from '@crm/lib';
import { permissionGroupLabel, sortPermissionGroups } from './permission-group-labels';

export type PermissionItem = {
  key: string;
  label: string;
  group: string;
};

export function PermissionGroupSections<T extends PermissionItem>({
  grouped,
  defaultOpen = false,
  renderPermission,
  className,
}: {
  grouped: Record<string, T[]>;
  defaultOpen?: boolean;
  renderPermission: (perm: T) => React.ReactNode;
  className?: string;
}) {
  const groups = sortPermissionGroups(Object.keys(grouped));

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {groups.map((group) => {
        const perms = grouped[group] ?? [];
        if (!perms.length) return null;

        return (
          <Collapsible key={group} defaultOpen={defaultOpen}>
            <div className="border-border rounded-md border">
              <CollapsibleTrigger className="hover:bg-muted/50 flex w-full items-center gap-2 px-3 py-2.5 text-left [&[data-state=open]>svg]:rotate-180">
                <ChevronDownIcon className="text-muted-foreground h-4 w-4 shrink-0 transition-transform" />
                <span className="flex-1 text-sm font-medium">{permissionGroupLabel(group)}</span>
                <Badge variant="outline" className="font-normal">
                  {perms.length}
                </Badge>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-border border-t px-3 py-2">
                  {perms.map(renderPermission)}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
}
