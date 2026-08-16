import { redirect } from 'next/navigation';
import { findUserByResetToken } from '@crm/admin';
import { ResetPasswordForm } from './reset-password-form';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token?.trim()) {
    redirect('/login');
  }

  const user = await findUserByResetToken(token);
  if (!user) {
    return (
      <div className="flex w-full max-w-md flex-col gap-4 text-center">
        <h1 className="text-xl font-semibold">Érvénytelen link</h1>
        <p className="text-muted-foreground text-sm">
          A jelszó-visszaállító link lejárt vagy már felhasználták. Kérjen újat az
          adminisztrátortól.
        </p>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}
