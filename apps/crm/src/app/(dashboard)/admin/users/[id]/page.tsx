import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePermission, requireAuth, hasPermission } from '@crm/auth';
import { Container } from '@crm/ui';
import { Button } from '@crm/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@crm/ui';
import { Badge } from '@crm/ui';
import { getUserForEdit, getUsersEditorData } from '../actions';
import { UserForm } from '../_components/user-form';
import { SendResetEmailButton } from '../_components/send-reset-email-button';

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('users:write');
  const current = await requireAuth();
  if (!current) return null;
  const { id } = await params;

  const [user, editorData, canSendMail] = await Promise.all([
    getUserForEdit(id),
    getUsersEditorData(),
    hasPermission('mail:send'),
  ]);
  if (!user) return notFound();

  return (
    <Container className="flex max-w-3xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <p className="text-muted-foreground text-sm">{user.email}</p>
          <div className="mt-2 flex gap-2">
            <Badge variant={user.isActive ? 'default' : 'secondary'}>
              {user.isActive ? 'Aktív' : 'Inaktív'}
            </Badge>
            {user.isLastActiveAdmin && <Badge variant="outline">Utolsó aktív admin</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canSendMail && <SendResetEmailButton userId={id} />}
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/users">Vissza a listához</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Felhasználó szerkesztése</CardTitle>
        </CardHeader>
        <CardContent>
          <UserForm
            mode="edit"
            roles={editorData.roles}
            permissions={editorData.permissions}
            initial={user}
            currentUserId={current.id}
          />
        </CardContent>
      </Card>
    </Container>
  );
}
