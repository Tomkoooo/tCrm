'use client';

import { useActionState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { acceptInviteAction, type InviteAcceptFormState } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useBranding } from '@/components/branding-provider';

const initialState: InviteAcceptFormState = { success: false };

export function InviteAcceptForm({
  token,
  name,
  email,
  kind,
  isLoggedIn,
  loggedInEmailMatches,
}: {
  token: string;
  name: string;
  email: string;
  kind: 'new_user' | 'company_join';
  isLoggedIn: boolean;
  loggedInEmailMatches: boolean;
}) {
  const router = useRouter();
  const { update } = useSession();
  const branding = useBranding();
  const [state, formAction, pending] = useActionState(acceptInviteAction, initialState);

  useEffect(() => {
    if (!state.success) return;
    void (async () => {
      const redirectTo = state.redirectTo ?? '/';

      if (state.needsSignIn) {
        const password = (document.getElementById('password') as HTMLInputElement | null)?.value;
        if (!password) {
          router.push('/login');
          return;
        }
        const result = await signIn('credentials', {
          email: state.email,
          password,
          redirect: false,
        });
        if (result?.ok) {
          await update();
          window.location.replace(redirectTo);
        } else {
          router.push('/login');
        }
        return;
      }

      await update();
      window.location.replace(redirectTo);
    })();
  }, [state, router, update]);

  const isCompanyJoin = kind === 'company_join';

  return (
    <>
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={branding.appName}
              className="mb-2 h-12 w-auto max-w-[200px] object-contain"
            />
          ) : null}
          <CardTitle className="text-2xl">
            {isCompanyJoin ? 'Cégmeghívó elfogadása' : 'Meghívó elfogadása'}
          </CardTitle>
          <CardDescription>
            {isCompanyJoin
              ? 'Csatlakozás dolgozóként egy céghez a meglévő fiókjával.'
              : `Állítsa be jelszavát a ${branding.appName} fiókhoz`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isCompanyJoin && !isLoggedIn && (
            <div className="mb-4 flex flex-col gap-2 text-sm">
              <p className="text-muted-foreground">
                Ehhez a meghívóhoz már létező fiók szükséges ({email}). Jelentkezzen be, majd nyissa
                meg újra a meghívó linket.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(`/register/invite?token=${token}`)}`}
                >
                  Bejelentkezés
                </Link>
              </Button>
            </div>
          )}

          {isCompanyJoin && isLoggedIn && !loggedInEmailMatches && (
            <p className="text-destructive mb-4 text-sm">
              A bejelentkezett fiók e-mail címe nem egyezik a meghívóval. Jelentkezzen be a
              megfelelő fiókkal.
            </p>
          )}

          {(!isCompanyJoin || (isLoggedIn && loggedInEmailMatches)) && (
            <form action={formAction} className="flex flex-col gap-6">
              <input type="hidden" name="token" value={token} />
              {isCompanyJoin && isLoggedIn && (
                <input type="hidden" name="mode" value="company_join_logged_in" />
              )}
              {state.success === false && state.message && (
                <p className="text-destructive text-sm">{state.message}</p>
              )}
              {state.success && <p className="text-sm text-green-600">{state.message}</p>}
              <div className="flex flex-col gap-2">
                <Label>Név</Label>
                <Input value={name} readOnly disabled className="bg-muted" />
              </div>
              <div className="flex flex-col gap-2">
                <Label>E-mail</Label>
                <Input value={email} readOnly disabled className="bg-muted" />
              </div>
              {!isCompanyJoin && (
                <>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="password">Jelszó</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                    />
                    {state.success === false && state.fieldErrors?.password && (
                      <p className="text-destructive text-sm">{state.fieldErrors.password[0]}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="confirmPassword">Jelszó megerősítése</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                    />
                    {state.success === false && state.fieldErrors?.confirmPassword && (
                      <p className="text-destructive text-sm">
                        {state.fieldErrors.confirmPassword[0]}
                      </p>
                    )}
                  </div>
                </>
              )}
              <Button type="submit" disabled={pending || state.success === true} className="w-full">
                {pending
                  ? 'Feldolgozás…'
                  : state.success
                    ? 'Átirányítás…'
                    : isCompanyJoin
                      ? 'Csatlakozás a céghez'
                      : 'Fiók létrehozása'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
      {branding.footerText ? (
        <p className="text-muted-foreground max-w-md text-center text-xs">{branding.footerText}</p>
      ) : null}
    </>
  );
}
