import { redirect } from 'next/navigation';
import { auth } from '@crm/auth';
import { findValidInvitationByToken } from '@crm/core';
import { InviteAcceptForm } from './invite-accept-form';

export default async function RegisterInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token?.trim()) {
    redirect('/login');
  }

  const invitation = await findValidInvitationByToken(token);
  if (!invitation) {
    return (
      <div className="flex w-full max-w-md flex-col gap-4 text-center">
        <h1 className="text-xl font-semibold">Érvénytelen meghívó</h1>
        <p className="text-muted-foreground text-sm">
          A link lejárt, már felhasználták, vagy nem létezik. Kérjen új meghívót az
          adminisztrátortól.
        </p>
      </div>
    );
  }

  const session = await auth();
  const sessionEmail = session?.user?.email?.toLowerCase() ?? '';
  const inviteEmail = invitation.email.toLowerCase();

  return (
    <InviteAcceptForm
      token={token}
      name={invitation.name}
      email={invitation.email}
      kind={invitation.kind ?? 'new_user'}
      isLoggedIn={Boolean(session?.user)}
      loggedInEmailMatches={Boolean(sessionEmail && sessionEmail === inviteEmail)}
    />
  );
}
