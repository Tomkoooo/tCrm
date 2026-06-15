'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { loginAction, type LoginFormState } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useBranding } from '@/components/branding-provider';

const initialState: LoginFormState = { success: false };

export function LoginForm({ showRegisterLink = false }: { showRegisterLink?: boolean }) {
  const branding = useBranding();
  const [state, formAction, pending] = useActionState(loginAction, initialState);

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
          <CardTitle className="text-2xl">{branding.loginTitle}</CardTitle>
          <CardDescription>{branding.loginSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-6" data-testid="login-form">
            {state.success === false && state.message && (
              <p className="text-destructive text-sm">{state.message}</p>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
              {state.success === false && state.fieldErrors?.email && (
                <p className="text-sm text-red-600">{state.fieldErrors.email[0]}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
              {state.success === false && state.fieldErrors?.password && (
                <p className="text-sm text-red-600">{state.fieldErrors.password[0]}</p>
              )}
            </div>
            <Button
              type="submit"
              loading={pending}
              disabled={pending}
              className="w-full"
              data-testid="login-submit"
            >
              {pending ? 'Signing in...' : 'Sign in'}
            </Button>
            {showRegisterLink && (
              <p className="text-muted-foreground text-center text-sm">
                No account?{' '}
                <Link href="/register" className="text-primary underline-offset-4 hover:underline">
                  Register
                </Link>
              </p>
            )}
          </form>
        </CardContent>
      </Card>
      {branding.footerText ? (
        <p className="text-muted-foreground max-w-md text-center text-xs">{branding.footerText}</p>
      ) : null}
    </>
  );
}
