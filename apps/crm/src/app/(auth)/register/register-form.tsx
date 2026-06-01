'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerAction, type RegisterFormState } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmployeeProfileFields, type CompanyOption } from '@/components/hr/employee-profile-fields';
import { useBranding } from '@/components/branding-provider';

const initialState: RegisterFormState = { success: false };

export function RegisterForm({ companies }: { companies: CompanyOption[] }) {
  const router = useRouter();
  const branding = useBranding();
  const [state, formAction, pending] = useActionState(registerAction, initialState);
  const hasCompanies = companies.length > 0;

  useEffect(() => {
    if (state.success) {
      router.push('/login');
    }
  }, [state.success, router]);

  return (
    <>
      <Card className="w-full max-w-lg">
        <CardHeader className="items-center text-center">
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={branding.appName}
              className="mb-2 h-12 w-auto max-w-[200px] object-contain"
            />
          ) : null}
          <CardTitle className="text-2xl">Regisztráció</CardTitle>
          <CardDescription>{branding.appName} fiók és opcionális dolgozói profil</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-6">
            {state.success === false && state.message && (
              <p
                className={
                  state.message.includes('létrehozva')
                    ? 'text-sm text-green-600'
                    : 'text-destructive text-sm'
                }
              >
                {state.message}
              </p>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Név</Label>
              <Input id="name" name="name" required />
              {state.success === false && state.fieldErrors?.name && (
                <p className="text-destructive text-sm">{state.fieldErrors.name[0]}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
              {state.success === false && state.fieldErrors?.email && (
                <p className="text-destructive text-sm">{state.fieldErrors.email[0]}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Jelszó</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
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

            {hasCompanies ? (
              <EmployeeProfileFields
                companies={companies}
                defaultChecked
                checkboxName="registerAsEmployee"
                checkboxLabel="Regisztráció dolgozóként (beosztás, kérelmek)"
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                Dolgozói profil: a HR-nek előbb létre kell hoznia egy céget, vagy az admin hozza
                létre a fiókját.
              </p>
            )}

            <Button type="submit" loading={pending} disabled={pending} className="w-full">
              {pending ? 'Létrehozás…' : 'Regisztráció'}
            </Button>
            <p className="text-muted-foreground text-center text-sm">
              Van már fiókja?{' '}
              <Link href="/login" className="text-primary underline-offset-4 hover:underline">
                Bejelentkezés
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
