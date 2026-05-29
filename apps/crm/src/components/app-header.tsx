'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Container } from '@crm/ui';
import { ThemeToggle } from '@/components/theme-toggle';

export function translateSegment(segment: string): string {
  const map: Record<string, string> = {
    login: 'Bejelentkezés',
    register: 'Regisztráció',
    admin: 'Adminisztráció',
    permissions: 'Szerepkörök és jogosultságok',
    users: 'Felhasználók',
    warehouses: 'Raktárak',
    suppliers: 'Beszállítók',
    inventory: 'Készlet',
    categories: 'Termékkategóriák',
    import: 'Importálás',
    logistics: 'Logisztika',
    movements: 'Készletmozgások',
    reservations: 'Foglalások',
    jobs: 'Szállítások',
    vehicles: 'Járműflotta',
    dashboard: 'Vezérlőpult',
    offers: 'Ajánlatok',
    builds: 'Összeszerelések',
    account: 'Fiók',
    secrets: 'Titoktár',
    create: 'Létrehozás',
    edit: 'Szerkesztés',
    grn: 'Bevételezés',
    pick: 'Kiadás',
    transfer: 'Raktárközi',
    new: 'Új',
  };
  return map[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
}

export default function AppHeader() {
  const pathname = usePathname();
  const pathnameSegments = pathname.split('/').filter((segment) => segment !== '');
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const scrollToEnd = () => {
      el.scrollLeft = el.scrollWidth;
    };

    scrollToEnd();
    window.addEventListener('resize', scrollToEnd);
    return () => window.removeEventListener('resize', scrollToEnd);
  }, [pathnameSegments.length]);

  return (
    <Container className="bg-background sticky top-0 z-10 pb-0">
      <div className="flex flex-row items-center gap-2">
        <SidebarTrigger />
        <Breadcrumb className="invis-scroll flex-1 overflow-x-auto" ref={ref}>
          <BreadcrumbList className="flex flex-row flex-nowrap items-center gap-2">
            {pathnameSegments.length > 0 ? (
              pathnameSegments.map((segment, index) => (
                <div key={`item-${index}`} className="flex flex-row items-center gap-2">
                  {index > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href={`/${pathnameSegments.slice(0, index + 1).join('/')}`}>
                        {translateSegment(segment)}
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </div>
              ))
            ) : (
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/">Vezérlőpult</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>
        <ThemeToggle />
      </div>
      <hr className="mt-4" />
    </Container>
  );
}
