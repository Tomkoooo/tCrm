'use client';

import Link from 'next/link';
import { useCallback, useMemo } from 'react';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboardIcon,
  UsersIcon,
  ShieldIcon,
  ImagesIcon,
  PaletteIcon,
  MailIcon,
  LogOutIcon,
  UserIcon,
  CircleHelpIcon,
  PackageIcon,
  FolderTreeIcon,
  TruckIcon,
  Building2Icon,
  LayoutGridIcon,
} from 'lucide-react';
import {
  SUPPLIER_READ_PERMISSION_KEYS,
  WAREHOUSE_READ_PERMISSION_KEYS,
} from '@crm/inventory/permissions';
import { MEDIA_READ_PERMISSION_KEYS } from '@crm/media/permissions';
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
  Button,
  Avatar,
  AvatarFallback,
  Skeleton,
  cn,
} from '@crm/ui';
import { getInitials } from '@crm/lib';
import { useAuth } from '@crm/auth/client';
import { useBranding } from '@/components/branding-provider';
import { SidebarNavGroup, type SidebarNavItem } from '@/components/sidebar-nav-group';

type SidebarUser = {
  id: string;
  email: string;
  name: string;
  permissions: string[];
};

export function MenuItem({
  href,
  icon,
  label,
  onClick,
  tourId,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  tourId?: string;
}) {
  return (
    <SidebarMenuItem data-tour={tourId}>
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          'bg-muted flex flex-row items-center gap-2 rounded-md px-2 py-1.5 transition-all duration-300 hover:tracking-wider md:py-1'
        )}
      >
        {icon}
        {label}
      </Link>
    </SidebarMenuItem>
  );
}

export function AppSidebar({ serverUser }: { serverUser?: SidebarUser }) {
  const { user: clientUser, isLoading } = useAuth();
  const user = serverUser ?? clientUser ?? null;
  const authLoading = isLoading && !user;
  const branding = useBranding();
  const { setOpenMobile } = useSidebar();

  const linkClick = useCallback(() => {
    setOpenMobile(false);
  }, [setOpenMobile]);

  const hasPermission = (key: string) => user?.permissions.includes(key) ?? false;

  const inventoryItems = useMemo((): SidebarNavItem[] => {
    const items: SidebarNavItem[] = [];
    if (hasPermission('inventory:read')) {
      items.push({
        href: '/inventory/dashboard',
        icon: <LayoutGridIcon className="h-4 w-4" />,
        label: 'Termékmenedzsment',
      });
      items.push({
        href: '/inventory',
        icon: <PackageIcon className="h-4 w-4" />,
        label: 'Termékek',
      });
      items.push({
        href: '/inventory/categories',
        icon: <FolderTreeIcon className="h-4 w-4" />,
        label: 'Termékkategóriák',
      });
    }
    if (SUPPLIER_READ_PERMISSION_KEYS.some((key) => hasPermission(key))) {
      items.push({
        href: '/inventory/suppliers',
        icon: <TruckIcon className="h-4 w-4" />,
        label: 'Beszállítók',
      });
    }
    return items;
  }, [user?.permissions]);

  const adminItems = useMemo((): SidebarNavItem[] => {
    if (!hasPermission('admin:access')) return [];
    const items: SidebarNavItem[] = [];
    if (hasPermission('users:read')) {
      items.push({
        href: '/admin/users',
        icon: <UsersIcon className="h-4 w-4" />,
        label: 'Felhasználók',
      });
    }
    if (hasPermission('roles:manage')) {
      items.push({
        href: '/admin/permissions',
        icon: <ShieldIcon className="h-4 w-4" />,
        label: 'Szerepkörök',
      });
    }
    if (hasPermission('mail:manage')) {
      items.push({
        href: '/admin/mail-templates',
        icon: <MailIcon className="h-4 w-4" />,
        label: 'E-mail sablonok',
      });
    }
    if (WAREHOUSE_READ_PERMISSION_KEYS.some((key) => hasPermission(key))) {
      items.push({
        href: '/admin/warehouses',
        icon: <Building2Icon className="h-4 w-4" />,
        label: 'Raktárak',
      });
    }
    if (MEDIA_READ_PERMISSION_KEYS.some((key) => hasPermission(key))) {
      items.push({
        href: '/admin/media',
        icon: <ImagesIcon className="h-4 w-4" />,
        label: 'Médiatár',
      });
    }
    items.push({
      href: '/admin/branding',
      icon: <PaletteIcon className="h-4 w-4" />,
      label: 'Arculat',
    });
    return items;
  }, [user?.permissions]);

  return (
    <Sidebar className="max-w-full">
      <SidebarHeader className="flex flex-row items-center gap-2 p-4">
        {branding.logoUrl ? (
          <img
            src={branding.logoUrl}
            alt={branding.appName}
            className="size-8 shrink-0 rounded-md object-contain"
          />
        ) : null}
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-medium leading-none">{branding.appName}</span>
          <span className="text-muted-foreground truncate text-xs">{branding.companyName}</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Általános</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <MenuItem
                href="/"
                icon={<LayoutDashboardIcon className="h-4 w-4" />}
                label="Vezérlőpult"
                onClick={linkClick}
                tourId="dashboard"
              />
              <MenuItem
                href="/help"
                icon={<CircleHelpIcon className="h-4 w-4" />}
                label="Súgó"
                onClick={linkClick}
                tourId="help"
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarNavGroup
          label="Készletkezelés"
          items={inventoryItems}
          onLinkClick={linkClick}
          tourId="inventory"
        />

        <SidebarGroup>
          <SidebarGroupLabel>Beállítások</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <MenuItem
                href="/account"
                icon={<UserIcon className="h-4 w-4" />}
                label="Fiók"
                onClick={linkClick}
                tourId="account"
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {adminItems.length > 0 && (
          <SidebarNavGroup
            label="Adminisztráció"
            items={adminItems}
            onLinkClick={linkClick}
            tourId="admin"
          />
        )}
      </SidebarContent>
      <SidebarFooter>
        {authLoading ? (
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
              Bejelentkezés
            </Link>
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
