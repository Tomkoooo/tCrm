'use client';

import Link from 'next/link';
import { useCallback, useMemo } from 'react';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboardIcon,
  BarChart3Icon,
  PackageIcon,
  TruckIcon,
  CarIcon,
  ClipboardListIcon,
  ArrowRightLeftIcon,
  LockIcon,
  FileTextIcon,
  WrenchIcon,
  UsersIcon,
  ShieldIcon,
  Building2Icon,
  HandshakeIcon,
  LogOutIcon,
  UserIcon,
  TagsIcon,
  ImagesIcon,
  KeyRoundIcon,
} from 'lucide-react';
import {
  MEDIA_READ_PERMISSION_KEYS,
  SECRETS_READ_PERMISSION_KEYS,
  SUPPLIER_READ_PERMISSION_KEYS,
} from '@crm/lib';
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
import { SidebarNavGroup, type SidebarNavItem } from '@/components/sidebar-nav-group';

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

  const inventoryItems = useMemo((): SidebarNavItem[] => {
    if (!hasPermission('inventory:read')) return [];
    const items: SidebarNavItem[] = [
      {
        href: '/inventory/dashboard',
        icon: <BarChart3Icon className="h-4 w-4" />,
        label: 'Termékmenedzsment',
      },

      {
        href: '/inventory',
        icon: <PackageIcon className="h-4 w-4" />,
        label: 'Termékek',
      },
      {
        href: '/inventory/builds',
        icon: <WrenchIcon className="h-4 w-4" />,
        label: 'Összeszerelések',
      },
      {
        href: '/inventory/categories',
        icon: <TagsIcon className="h-4 w-4" />,
        label: 'Termékkategóriák',
      },
    ];
    if (SUPPLIER_READ_PERMISSION_KEYS.some((key) => hasPermission(key))) {
      items.push({
        href: '/inventory/suppliers',
        icon: <HandshakeIcon className="h-4 w-4" />,
        label: 'Beszállítók',
      });
    }
    return items;
  }, [user?.permissions]);

  const logisticsItems = useMemo((): SidebarNavItem[] => {
    if (!hasPermission('logistics:read')) return [];
    return [
      {
        href: '/logistics',
        icon: <TruckIcon className="h-4 w-4" />,
        label: 'Áttekintés',
      },
      {
        href: '/logistics/movements',
        icon: <ArrowRightLeftIcon className="h-4 w-4" />,
        label: 'Készletmozgások',
      },
      {
        href: '/logistics/reservations',
        icon: <LockIcon className="h-4 w-4" />,
        label: 'Foglalások',
      },
      {
        href: '/logistics/jobs',
        icon: <ClipboardListIcon className="h-4 w-4" />,
        label: 'Szállítások',
      },
      {
        href: '/logistics/vehicles',
        icon: <CarIcon className="h-4 w-4" />,
        label: 'Járműflotta',
      },
    ];
  }, [user?.permissions]);

  const salesItems = useMemo((): SidebarNavItem[] => {
    const items: SidebarNavItem[] = [];
    if (hasPermission('offers:read')) {
      items.push({
        href: '/offers',
        icon: <FileTextIcon className="h-4 w-4" />,
        label: 'Ajánlatok',
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
    if (hasPermission('warehouses:read')) {
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
    return items;
  }, [user?.permissions]);

  return (
    <Sidebar className="max-w-full">
      <SidebarHeader className="flex flex-row items-center gap-2 p-4">
        <div className="flex flex-col gap-0.5">
          <span className="truncate font-medium leading-none">tCrm</span>
          <span className="text-muted-foreground truncate text-xs">Belső CRM</span>
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
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarNavGroup label="Készletkezelés" items={inventoryItems} onLinkClick={linkClick} />

        <SidebarNavGroup label="Logisztika" items={logisticsItems} onLinkClick={linkClick} />

        {salesItems.length > 0 && (
          <SidebarNavGroup label="Értékesítés" items={salesItems} onLinkClick={linkClick} />
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Beállítások</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <MenuItem
                href="/account"
                icon={<UserIcon className="h-4 w-4" />}
                label="Fiók"
                onClick={linkClick}
              />
              {SECRETS_READ_PERMISSION_KEYS.some((key) => hasPermission(key)) && (
                <MenuItem
                  href="/secrets"
                  icon={<KeyRoundIcon className="h-4 w-4" />}
                  label="Titoktár"
                  onClick={linkClick}
                />
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {adminItems.length > 0 && (
          <SidebarNavGroup label="Adminisztráció" items={adminItems} onLinkClick={linkClick} />
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
              Bejelentkezés
            </Link>
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
