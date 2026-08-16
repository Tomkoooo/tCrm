'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { resetPasswordAction, type ResetPasswordFormState } from './actions';
import { Button } from '@crm/ui';
import { Input } from '@crm/ui';
import { Label } from '@crm/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@crm/ui';
import { useBranding } from '@/components/branding-provider';

const initialState: ResetPasswordFormState = { success: false };

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const branding = useBranding();
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);

  useEffect(() => {
    if (state.success) {
      router.push('/login');
    }
  }, [state.success, router]);

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
          <CardTitle className="text-2xl">Új jelszó</CardTitle>
          <CardDescription>Adja meg az új jelszavát a {branding.appName} fiókhoz</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-6">
            <input type="hidden" name="token" value={token} />
            {state.success === false && state.message && (
              <p className="text-destructive text-sm">{state.message}</p>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Új jelszó</Label>
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
            <Button type="submit" loading={pending} disabled={pending} className="w-full">
              {pending ? 'Mentés…' : 'Jelszó mentése'}
            </Button>
            <p className="text-muted-foreground text-center text-sm">
              <Link href="/login" className="text-primary underline-offset-4 hover:underline">
                Vissza a bejelentkezéshez
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
      {branding.footerText ? (
        <p className="text-muted-foreground max-w-md text-center text-xs">{branding.footerText}</p>
      ) : null}
    </>
  );
}
