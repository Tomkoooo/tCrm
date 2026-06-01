'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { setupAdminAction, type SetupState } from './actions';

const initialState: SetupState = { success: false };

export function SetupForm() {
  const [state, formAction, pending] = useActionState(setupAdminAction, initialState);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Initial setup</h1>
        <p className="text-muted-foreground text-sm">
          Create the first global admin account. After this, public registration is disabled.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Global admin</CardTitle>
          <CardDescription>Choose a secure password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            {state.success === false && state.message && (
              <p className="text-destructive text-sm">{state.message}</p>
            )}

            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
              {state.success === false &&
                state.fieldErrors?.name?.map((m) => (
                  <p key={m} className="text-destructive text-sm">
                    {m}
                  </p>
                ))}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
              {state.success === false &&
                state.fieldErrors?.email?.map((m) => (
                  <p key={m} className="text-destructive text-sm">
                    {m}
                  </p>
                ))}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
              {state.success === false &&
                state.fieldErrors?.password?.map((m) => (
                  <p key={m} className="text-destructive text-sm">
                    {m}
                  </p>
                ))}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" required />
              {state.success === false &&
                state.fieldErrors?.confirmPassword?.map((m) => (
                  <p key={m} className="text-destructive text-sm">
                    {m}
                  </p>
                ))}
            </div>

            <Button type="submit" loading={pending} disabled={pending}>
              {pending ? 'Creating...' : 'Create admin'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        Already initialized?{' '}
        <Link className="underline" href="/login">
          Go to login
        </Link>
      </p>
    </div>
  );
}
