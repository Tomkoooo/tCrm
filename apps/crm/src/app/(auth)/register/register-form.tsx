'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerAction, type RegisterFormState } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const initialState: RegisterFormState = { success: false };

export function RegisterForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  useEffect(() => {
    if (state.success) {
      router.push('/login');
    }
  }, [state.success, router]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Create account</CardTitle>
        <CardDescription>Register for tCrm access</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-6">
          {state.success === false && state.message && (
            <p
              className={
                state.message.includes('created')
                  ? 'text-sm text-green-600'
                  : 'text-destructive text-sm'
              }
            >
              {state.message}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
            {state.success === false && state.fieldErrors?.name && (
              <p className="text-sm text-red-600">{state.fieldErrors.name[0]}</p>
            )}
          </div>
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
              autoComplete="new-password"
              required
            />
            {state.success === false && state.fieldErrors?.password && (
              <p className="text-sm text-red-600">{state.fieldErrors.password[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
            />
            {state.success === false && state.fieldErrors?.confirmPassword && (
              <p className="text-sm text-red-600">{state.fieldErrors.confirmPassword[0]}</p>
            )}
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? 'Creating account...' : 'Create account'}
          </Button>
          <p className="text-muted-foreground text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
