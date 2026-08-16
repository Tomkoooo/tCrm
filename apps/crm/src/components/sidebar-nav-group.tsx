'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDownIcon } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@crm/ui';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@crm/ui';
import { isNavItemActive, resolveActiveNavHref } from '@/lib/navigation/active-nav';
import { cn } from '@crm/lib';

export type SidebarNavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

export function SidebarNavGroup({
  label,
  items,
  defaultOpen = true,
  onLinkClick,
  tourId,
}: {
  label: string;
  items: SidebarNavItem[];
  defaultOpen?: boolean;
  onLinkClick?: () => void;
  tourId?: string;
}) {
  const pathname = usePathname();
  const hrefs = items.map((item) => item.href);
  const isActiveGroup = resolveActiveNavHref(pathname, hrefs) !== null;

  if (items.length === 0) return null;

  return (
    <Collapsible defaultOpen={defaultOpen || isActiveGroup} className="group/collapsible">
      <SidebarGroup data-tour={tourId}>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="hover:bg-sidebar-accent flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium">
            {label}
            <ChevronDownIcon
              className={cn(
                'h-4 w-4 shrink-0 transition-transform',
                'group-data-[state=open]/collapsible:rotate-180'
              )}
            />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuSub>
                  {items.map((item) => {
                    const active = isNavItemActive(pathname, item.href, hrefs);
                    return (
                      <SidebarMenuSubItem key={item.href}>
                        <SidebarMenuSubButton asChild isActive={active}>
                          <Link href={item.href} onClick={onLinkClick}>
                            {item.icon}
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    );
                  })}
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
