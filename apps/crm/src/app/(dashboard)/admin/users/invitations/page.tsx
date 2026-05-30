import Link from 'next/link';
import { requirePermission } from '@crm/auth';
import { buildInviteLink, getInvitationStatus } from '@crm/core';
import { connectDB, Role, User, UserInvitation } from '@crm/db';
import { Container } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { InvitationsTable, type InvitationRow } from './_components/invitations-table';

export default async function UserInvitationsPage() {
  await requirePermission('users:read');
  await connectDB();

  const invitations = await UserInvitation.find()
    .sort({ createdAt: -1 })
    .populate({ path: 'invitedBy', select: 'name email' })
    .populate({ path: 'roleIds', select: 'name' })
    .lean()
    .exec();

  const data: InvitationRow[] = invitations.map((inv) => {
    const roles = (inv.roleIds ?? []) as Array<{ name?: string }>;
    const inviter = inv.invitedBy as { name?: string; email?: string } | null;
    const status = getInvitationStatus({
      isUsed: inv.isUsed,
      expiresAt: inv.expiresAt,
    });

    return {
      _id: String(inv._id),
      name: inv.name,
      email: inv.email,
      status,
      inviteLink: buildInviteLink(inv.token),
      invitedByName: inviter?.name || inviter?.email || '—',
      roleNames:
        roles
          .map((r) => r.name ?? '')
          .filter(Boolean)
          .join(', ') || '—',
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
    };
  });

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Kiküldött meghívók</h1>
          <p className="text-muted-foreground text-sm">
            Összes kiküldött meghívó, állapot szerint szűrhető. A link másolható — csak a függőben
            lévő, nem lejárt meghívók használhatók regisztrációra.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/users">Felhasználók</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/users/invite">Új meghívó</Link>
          </Button>
        </div>
      </div>

      <InvitationsTable data={data} />
    </Container>
  );
}
