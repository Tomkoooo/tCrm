import { requireAuth, getEffectivePermissionKeys } from '@crm/auth';
import { connectDB, Permission } from '@crm/db-core';
import { Container } from '@crm/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@crm/ui';
import { getAccountData } from './actions';
import { ProfileForm } from './_components/profile-form';
import { PasswordForm } from './_components/password-form';
import { PermissionsSummary } from './_components/permissions-summary';

export default async function AccountPage() {
  const sessionUser = await requireAuth();
  if (!sessionUser) return null;

  const account = await getAccountData(sessionUser.id);

  if (!account) {
    return null;
  }

  await connectDB();
  const permissions = await Permission.find().sort({ group: 1, key: 1 }).lean().exec();
  const effectiveKeys = Array.from(await getEffectivePermissionKeys(sessionUser.id));

  const permissionsByGroup = permissions.reduce<
    Record<string, Array<{ key: string; label: string; group: string }>>
  >((acc, p) => {
    acc[p.group] = acc[p.group] ?? [];
    acc[p.group].push({ key: p.key, label: p.label, group: p.group });
    return acc;
  }, {});

  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold">Fiók</h1>
        <p className="text-muted-foreground text-sm">
          Saját profil, jelszó és jogosultságok áttekintése.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
          <CardDescription>Név szerkesztése — e-mail csak admin módosíthatja</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm name={account.name} email={account.email} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Jelszó</CardTitle>
          <CardDescription>Jelenlegi jelszó megadásával állítható új jelszó</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>

      <PermissionsSummary
        roles={account.roles}
        directPermissionKeys={account.directPermissionKeys}
        effectiveKeys={effectiveKeys}
        permissionsByGroup={permissionsByGroup}
      />
    </Container>
  );
}
