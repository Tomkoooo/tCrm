'use client';

import { useActionState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
}: {
  token: string;
  name: string;
  email: string;
}) {
  const router = useRouter();
  const branding = useBranding();
  const [state, formAction, pending] = useActionState(acceptInviteAction, initialState);

  useEffect(() => {
    if (!state.success) return;
    void (async () => {
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
        router.push('/');
        router.refresh();
      } else {
        router.push('/login');
      }
    })();
  }, [state, router]);

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
          <CardTitle className="text-2xl">Meghívó elfogadása</CardTitle>
          <CardDescription>Állítsa be jelszavát a {branding.appName} fiókhoz</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-6">
            <input type="hidden" name="token" value={token} />
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
                <p className="text-destructive text-sm">{state.fieldErrors.confirmPassword[0]}</p>
              )}
            </div>
            <Button type="submit" disabled={pending || state.success === true} className="w-full">
              {pending ? 'Létrehozás…' : state.success ? 'Bejelentkezés…' : 'Fiók létrehozása'}
            </Button>
          </form>
        </CardContent>
      </Card>
      {branding.footerText ? (
        <p className="text-muted-foreground max-w-md text-center text-xs">{branding.footerText}</p>
      ) : null}
    </>
  );
}
