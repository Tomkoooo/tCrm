import Link from 'next/link';
import { notFound } from 'next/navigation';
import mongoose from 'mongoose';
import { requirePermission } from '@crm/auth';
import { connectDB, Role, SecretProject, User } from '@crm/db';
import {
  canDeleteSecretProject,
  canManageSecretProjectAccess,
  canReadSecretProject,
  canWriteSecretProject,
  toSecretAccessUser,
} from '@crm/core';
import { Container } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SecretItemsPanel } from '../_components/secret-items-panel';
import { SecretAccessForm } from '../_components/secret-access-form';
import { DeleteSecretProjectButton } from '../_components/delete-secret-project-button';

export default async function SecretProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sessionUser = await requirePermission('secrets:read');
  if (!sessionUser) return notFound();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return notFound();
  }

  await connectDB();
  const dbUser = await User.findById(sessionUser.id).select('roleIds').lean().exec();
  if (!dbUser) return notFound();

  const accessUser = toSecretAccessUser(sessionUser, dbUser.roleIds ?? []);
  const project = await SecretProject.findById(id).exec();
  if (!project || !canReadSecretProject(accessUser, project)) {
    return notFound();
  }

  const canWrite = canWriteSecretProject(accessUser, project);
  const canDelete = canDeleteSecretProject(accessUser, project);
  const canManageAccess = canManageSecretProjectAccess(accessUser, project);

  const items = project.secrets.map((s) => ({
    id: s._id.toString(),
    key: s.key,
    description: s.description,
  }));

  const [roles, users] = canManageAccess
    ? await Promise.all([
        Role.find().sort({ name: 1 }).select('name').lean().exec(),
        User.find({ isActive: true }).sort({ name: 1 }).select('name email').lean().exec(),
      ])
    : [[], []];

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground text-sm">{project.description}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/secrets">Vissza a listához</Link>
          </Button>
          {canDelete && <DeleteSecretProjectButton projectId={id} />}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Titkok</CardTitle>
        </CardHeader>
        <CardContent>
          <SecretItemsPanel projectId={id} items={items} canWrite={canWrite} />
        </CardContent>
      </Card>

      {canManageAccess && (
        <Card>
          <CardHeader>
            <CardTitle>Megosztás</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4 text-sm">
              Alapértelmezetten privát: csak a létrehozó és a secrets:manage jogú felhasználók
              látják. Itt adhat hozzá szerepköröket és felhasználókat.
            </p>
            <SecretAccessForm
              projectId={id}
              roles={roles.map((r) => ({ id: String(r._id), name: r.name }))}
              users={users.map((u) => ({
                id: String(u._id),
                name: u.name,
                email: u.email,
              }))}
              initialRoleIds={(project.allowedRoles ?? []).map((rid) => rid.toString())}
              initialUserIds={(project.allowedUsers ?? []).map((uid) => uid.toString())}
            />
          </CardContent>
        </Card>
      )}
    </Container>
  );
}
