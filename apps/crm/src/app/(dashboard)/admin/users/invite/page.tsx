import Link from 'next/link';
import { requirePermission, requireAuth } from '@crm/auth';
import { Container } from '@crm/ui';
import { Button } from '@crm/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@crm/ui';
import { getUsersEditorData } from '../actions';
import { InviteUserForm } from '../_components/invite-user-form';

export default async function InviteUserPage() {
  await requirePermission('users:write');
  await requirePermission('mail:send');
  await requireAuth();

  const { roles, permissions } = await getUsersEditorData();

  return (
    <Container className="flex max-w-3xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Felhasználó meghívása</h1>
          <p className="text-muted-foreground text-sm">
            E-mailben küldött link — a meghívott beállítja a jelszavát és automatikusan
            bejelentkezik.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/users/new">Közvetlen létrehozás</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/users">Lista</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Meghívó</CardTitle>
          <CardDescription>
            Szerepkörök és jogosultságok a link aktiválásakor kerülnek a fiókra.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteUserForm roles={roles} permissions={permissions} />
        </CardContent>
      </Card>
    </Container>
  );
}
