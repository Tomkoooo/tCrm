import Link from 'next/link';
import {
  PackageIcon,
  TruckIcon,
  FileTextIcon,
  UsersIcon,
  ShieldIcon,
  TrendingUpIcon,
  ListIcon,
} from 'lucide-react';
import { getCurrentUser } from '@crm/auth';
import { Container } from '@crm/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const permissions = user?.permissions ?? [];

  const has = (key: string) => permissions.includes(key);

  const stats = [
    { label: 'Products', value: '—', icon: PackageIcon, show: has('inventory:read') },
    { label: 'Open Offers', value: '—', icon: FileTextIcon, show: has('offers:read') },
    { label: 'Shipments', value: '—', icon: TruckIcon, show: has('logistics:read') },
    { label: 'Users', value: '—', icon: UsersIcon, show: has('users:read') },
  ].filter((s) => s.show);

  const quickActions = [
    { label: 'View inventory', href: '/inventory', icon: PackageIcon, show: has('inventory:read') },
    { label: 'Create offer', href: '/offers', icon: FileTextIcon, show: has('offers:write') },
    {
      label: 'Manage roles',
      href: '/admin/permissions',
      icon: ShieldIcon,
      show: has('roles:manage'),
    },
    { label: 'Manage users', href: '/admin/users', icon: UsersIcon, show: has('users:read') },
  ].filter((a) => a.show);

  return (
    <Container className="flex max-w-6xl flex-col gap-4 pb-20 md:gap-6">
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-muted-foreground text-sm">
          Your operations dashboard — inventory, offers, logistics, and more.
        </p>
      </div>

      {stats.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                <stat.icon className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUpIcon className="h-5 w-5" />
            Getting started
          </CardTitle>
          <CardDescription>
            Phase 0 foundation is ready. Inventory, logistics, and offers modules arrive in Phase
            1+.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            You have {permissions.length} active permission{permissions.length !== 1 ? 's' : ''}.
            {has('roles:manage') && ' Use Roles & Permissions to configure access for your team.'}
          </p>
        </CardContent>
      </Card>

      {quickActions.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ListIcon className="h-5 w-5" />
                Quick actions
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
