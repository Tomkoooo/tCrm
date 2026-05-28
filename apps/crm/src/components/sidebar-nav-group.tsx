'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDownIcon } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

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
}: {
  label: string;
  items: SidebarNavItem[];
  defaultOpen?: boolean;
  onLinkClick?: () => void;
}) {
  const pathname = usePathname();
  const isActiveGroup = items.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  if (items.length === 0) return null;

  return (
    <Collapsible defaultOpen={defaultOpen || isActiveGroup} className="group/collapsible">
      <SidebarGroup>
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
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
