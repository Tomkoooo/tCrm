import Link from 'next/link';
import { requirePermission, requireAuth } from '@crm/auth';
import { Container } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getUsersEditorData } from '../actions';
import { UserForm } from '../_components/user-form';

export default async function NewUserPage() {
  await requirePermission('users:write');
  const current = await requireAuth();
  if (!current) return null;
  const { roles, permissions, companies } = await getUsersEditorData();

  return (
    <Container className="flex max-w-3xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Új felhasználó</h1>
          <p className="text-muted-foreground text-sm">
            Fiók, szerepkörök és opcionális dolgozói profil egy lépésben.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/users">Vissza a listához</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Adatok</CardTitle>
        </CardHeader>
        <CardContent>
          <UserForm
            mode="create"
            roles={roles}
            permissions={permissions}
            companies={companies}
            currentUserId={current.id}
          />
        </CardContent>
      </Card>
    </Container>
  );
}
