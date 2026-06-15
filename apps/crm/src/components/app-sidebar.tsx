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
  PaletteIcon,
  KeyRoundIcon,
  MailIcon,
  CalculatorIcon,
  CalendarDaysIcon,
  ClipboardCheckIcon,
  UserCircleIcon,
  CircleHelpIcon,
} from 'lucide-react';
import {
  ACCOUNTING_NAV_PERMISSION_KEYS,
  HR_READ_PERMISSION_KEYS,
  HR_REPORTS_PERMISSION_KEYS,
  LOGISTICS_READ_PERMISSION_KEYS,
  LOGISTICS_VEHICLES_READ_PERMISSION_KEYS,
  MEDIA_READ_PERMISSION_KEYS,
  SECRETS_READ_PERMISSION_KEYS,
  SUPPLIER_READ_PERMISSION_KEYS,
  hasAnyPermission,
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
import { useBranding } from '@/components/branding-provider';
import { getInitials } from '@/lib/utils';
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
  const userPermissions = user?.permissions ?? [];
  const hasAny = (keys: readonly string[]) => hasAnyPermission(userPermissions, keys);

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
    const items: SidebarNavItem[] = [];
    if (hasAny(LOGISTICS_READ_PERMISSION_KEYS)) {
      items.push(
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
        }
      );
    }
    if (hasAny(LOGISTICS_VEHICLES_READ_PERMISSION_KEYS)) {
      items.push({
        href: '/logistics/vehicles',
        icon: <CarIcon className="h-4 w-4" />,
        label: 'Járműflotta',
      });
    }
    return items;
  }, [user?.permissions]);

  const accountingItems = useMemo((): SidebarNavItem[] => {
    if (!ACCOUNTING_NAV_PERMISSION_KEYS.some((key) => hasPermission(key))) return [];
    const items: SidebarNavItem[] = [];
    if (
      ACCOUNTING_NAV_PERMISSION_KEYS.filter((k) => k !== 'hr:self').some((key) =>
        hasPermission(key)
      )
    ) {
      items.push({
        href: '/accounting',
        icon: <CalculatorIcon className="h-4 w-4" />,
        label: 'Áttekintés',
      });
    }
    if (hasPermission('hr:write')) {
      items.push({
        href: '/accounting/companies',
        icon: <Building2Icon className="h-4 w-4" />,
        label: 'Cégek',
      });
    }
    if (HR_READ_PERMISSION_KEYS.some((key) => hasPermission(key))) {
      items.push(
        {
          href: '/accounting/employees',
          icon: <UsersIcon className="h-4 w-4" />,
          label: 'Dolgozók',
        },
        {
          href: '/accounting/schedule',
          icon: <CalendarDaysIcon className="h-4 w-4" />,
          label: 'Beosztás',
        },
        {
          href: '/accounting/requests',
          icon: <ClipboardCheckIcon className="h-4 w-4" />,
          label: 'Kérelmek',
        }
      );
    }
    if (HR_REPORTS_PERMISSION_KEYS.some((key) => hasPermission(key))) {
      items.push({
        href: '/accounting/leave-summary',
        icon: <FileTextIcon className="h-4 w-4" />,
        label: 'Kimutatások',
      });
    }
    return items;
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
    if (hasPermission('mail:manage')) {
      items.push({
        href: '/admin/mail-templates',
        icon: <MailIcon className="h-4 w-4" />,
        label: 'E-mail sablonok',
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
              />
              <MenuItem
                href="/help"
                icon={<CircleHelpIcon className="h-4 w-4" />}
                label="Súgó"
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

        <SidebarNavGroup label="Könyvelés és HR" items={accountingItems} onLinkClick={linkClick} />

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
              <MenuItem
                href="/accounting/my"
                icon={<UserCircleIcon className="h-4 w-4" />}
                label="Saját beosztás"
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
