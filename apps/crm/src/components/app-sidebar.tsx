'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboardIcon,
  PackageIcon,
  TruckIcon,
  ArrowRightLeftIcon,
  LockIcon,
  FileTextIcon,
  WrenchIcon,
  UsersIcon,
  ShieldIcon,
  Building2Icon,
  LogOutIcon,
  UserIcon,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { getInitials } from '@/lib/utils';

export function MenuItem({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <SidebarMenuItem>
      <Link
        href={href}
        onClick={onClick}
        className="bg-muted flex flex-row items-center gap-2 rounded-md px-2 py-1.5 transition-all duration-300 hover:tracking-wider md:py-1"
      >
        {icon}
        {label}
      </Link>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const { user, isLoading } = useAuth();
  const { setOpenMobile } = useSidebar();

  const linkClick = useCallback(() => {
    setOpenMobile(false);
  }, [setOpenMobile]);

  const hasPermission = (key: string) => user?.permissions.includes(key) ?? false;

  return (
    <Sidebar className="max-w-full">
      <SidebarHeader className="flex flex-row items-center gap-2 p-4">
        <div className="flex flex-col gap-0.5">
          <span className="truncate font-medium leading-none">tCrm</span>
          <span className="text-muted-foreground truncate text-xs">Internal CRM</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>General</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <MenuItem
                href="/"
                icon={<LayoutDashboardIcon className="h-4 w-4" />}
                label="Dashboard"
                onClick={linkClick}
              />
              {hasPermission('inventory:read') && (
                <>
                  <MenuItem
                    href="/inventory"
                    icon={<PackageIcon className="h-4 w-4" />}
                    label="Inventory (Products)"
                    onClick={linkClick}
                  />
                  <MenuItem
                    href="/inventory/categories"
                    icon={<PackageIcon className="h-4 w-4" />}
                    label="Inventory Categories"
                    onClick={linkClick}
                  />
                  {hasPermission('inventory:import') && (
                    <MenuItem
                      href="/inventory/import"
                      icon={<PackageIcon className="h-4 w-4" />}
                      label="Inventory Import"
                      onClick={linkClick}
                    />
                  )}
                </>
              )}
              {hasPermission('logistics:read') && (
                <>
                  <MenuItem
                    href="/logistics"
                    icon={<TruckIcon className="h-4 w-4" />}
                    label="Logistics"
                    onClick={linkClick}
                  />
                  <MenuItem
                    href="/logistics/movements"
                    icon={<ArrowRightLeftIcon className="h-4 w-4" />}
                    label="Movements"
                    onClick={linkClick}
                  />
                  <MenuItem
                    href="/logistics/reservations"
                    icon={<LockIcon className="h-4 w-4" />}
                    label="Reservations"
                    onClick={linkClick}
                  />
                </>
              )}
              {hasPermission('offers:read') && (
                <MenuItem
                  href="/offers"
                  icon={<FileTextIcon className="h-4 w-4" />}
                  label="Offers"
                  onClick={linkClick}
                />
              )}
              {hasPermission('inventory:read') && (
                <MenuItem
                  href="/builds"
                  icon={<WrenchIcon className="h-4 w-4" />}
                  label="Builds"
                  onClick={linkClick}
                />
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <MenuItem
                href="/account"
                icon={<UserIcon className="h-4 w-4" />}
                label="Account"
                onClick={linkClick}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {hasPermission('admin:access') && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {hasPermission('users:read') && (
                  <MenuItem
                    href="/admin/users"
                    icon={<UsersIcon className="h-4 w-4" />}
                    label="Users"
                    onClick={linkClick}
                  />
                )}
                {hasPermission('roles:manage') && (
                  <MenuItem
                    href="/admin/permissions"
                    icon={<ShieldIcon className="h-4 w-4" />}
                    label="Roles & Permissions"
                    onClick={linkClick}
                  />
                )}
                {hasPermission('warehouses:read') && (
                  <MenuItem
                    href="/admin/warehouses"
                    icon={<Building2Icon className="h-4 w-4" />}
                    label="Warehouses"
                    onClick={linkClick}
                  />
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        {isLoading ? (
          <div className="flex h-9 w-full flex-row items-center justify-between">
            <div className="flex h-full w-full flex-row items-center gap-2">
              <Skeleton className="aspect-square w-9 rounded-full" />
              <div className="flex w-full flex-col gap-2">
                <Skeleton className="h-2 w-32" />
                <Skeleton className="h-2 w-16" />
              </div>
            </div>
          </div>
        ) : user ? (
          <div className="flex flex-row items-center justify-between">
            <div className="flex flex-row items-center gap-2">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground lowercase">
                  {user.name ? getInitials(user.name, 2) : user.email.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5 text-sm">
                <span className="truncate font-medium leading-none">{user.name || user.email}</span>
                <span className="text-muted-foreground truncate text-xs">{user.email}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                linkClick();
                signOut({ callbackUrl: '/login' });
              }}
            >
              <LogOutIcon className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button asChild>
            <Link href="/login" onClick={linkClick}>
              Sign in
            </Link>
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
