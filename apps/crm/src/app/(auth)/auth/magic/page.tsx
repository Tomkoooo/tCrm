import Link from 'next/link';
import { sanitizeMagicRedirect } from '@crm/auth/magic-link';
import { Button } from '@crm/ui';
import { MagicLinkForm } from './magic-link-form';

export default async function MagicLinkPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const token = typeof sp.token === 'string' ? sp.token.trim() : '';
  const redirectTo =
    sanitizeMagicRedirect(typeof sp.redirect === 'string' ? sp.redirect : undefined) ?? '/hr/me';

  if (!token) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold">Belépési link</h1>
          <p className="text-muted-foreground text-sm">
            Ez a link hiányos. Nyisd meg újra a beosztásról szóló e-mailből, vagy jelentkezz be a
            szokásos módon.
          </p>
        </div>
        <Button asChild>
          <Link href="/login">Bejelentkezés</Link>
        </Button>
      </div>
    );
  }

  return <MagicLinkForm token={token} redirectTo={redirectTo} />;
}
