import Link from 'next/link';
import { UsersIcon, ShieldIcon, TrendingUpIcon, ListIcon, PackageIcon } from 'lucide-react';
import { getCurrentUser } from '@crm/auth';
import {
  Container,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
} from '@crm/ui';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const permissions = user?.permissions ?? [];

  const has = (key: string) => permissions.includes(key);

  const quickActions = [
    {
      label: 'Termékek',
      href: '/inventory',
      icon: PackageIcon,
      show: has('inventory:read'),
    },
    {
      label: 'Szerepkörök kezelése',
      href: '/admin/permissions',
      icon: ShieldIcon,
      show: has('roles:manage'),
    },
    {
      label: 'Felhasználók kezelése',
      href: '/admin/users',
      icon: UsersIcon,
      show: has('users:read'),
    },
  ].filter((a) => a.show);

  return (
    <Container className="flex max-w-6xl flex-col gap-4 pb-20 md:gap-6">
      <div>
        <h1 className="text-3xl font-bold">
          Üdv újra{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-muted-foreground text-sm">tCrm vezérlőpult</p>
      </div>

      <PwaInstallPrompt />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUpIcon className="h-5 w-5" />
            Első lépések
          </CardTitle>
          <CardDescription>
            Az alaprendszer és a készletmodul kész. A logisztika, HR/könyvelés és ajánlatok modulok
            a következő fázisokban érkeznek.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">
            {permissions.length} aktív jogosultsága van.
            {has('roles:manage') &&
              ' A Szerepkörök és jogosultságok menüpontban állíthatja be a csapat hozzáférését.'}
          </p>
          <Button variant="outline" size="sm" className="w-fit" asChild>
            <Link href="/help">Felhasználói útmutató megnyitása</Link>
          </Button>
        </CardContent>
      </Card>

      {quickActions.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ListIcon className="h-5 w-5" />
                Gyors műveletek
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {quickActions.map((action) => (
                <Button
                  key={action.href}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  asChild
                >
                  <Link href={action.href}>
                    <action.icon className="mr-2 h-4 w-4" />
                    {action.label}
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </Container>
  );
}
