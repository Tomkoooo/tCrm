'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginAction, type LoginFormState } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const initialState: LoginFormState = { success: false };

export function LoginForm({ showRegisterLink = false }: { showRegisterLink?: boolean }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  useEffect(() => {
    if (state.success) {
      router.push('/');
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Sign in to tCrm</CardTitle>
        <CardDescription>Enter your credentials to access the CRM</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-6">
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
          <Button type="submit" disabled={pending} className="w-full">
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
  );
}
