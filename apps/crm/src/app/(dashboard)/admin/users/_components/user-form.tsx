'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { EmployeeProfileFields, type CompanyOption } from '@/components/hr/employee-profile-fields';
import { PermissionGroupSections } from '@/components/admin/permission-group-sections';
import { createUserAction, updateUserAction, type UserFormState } from '../actions';

type RoleOption = {
  id: string;
  key: string;
  name: string;
  description?: string;
  isSystem: boolean;
};

type PermissionOption = {
  key: string;
  label: string;
  group: string;
};

type UserFormProps = {
  mode: 'create' | 'edit';
  roles: RoleOption[];
  permissions: PermissionOption[];
  companies: CompanyOption[];
  initial?: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    roleIds: string[];
    directPermissionKeys: string[];
    isLastActiveAdmin?: boolean;
    employee?: {
      _id: string;
      companyId: string;
      employeeNumber?: string;
      department?: string;
      phone?: string;
      hrNotes?: string;
    };
  };
  currentUserId?: string;
};

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function UserForm({
  mode,
  roles,
  permissions,
  companies,
  initial,
  currentUserId,
}: UserFormProps) {
  const router = useRouter();
  const bound = mode === 'create' ? createUserAction : updateUserAction.bind(null, initial!.id);

  const [state, action, pending] = useActionState(bound, {
    success: false,
  } satisfies UserFormState);

  const isSelf = mode === 'edit' && initial?.id === currentUserId;
  const lockActive = Boolean(initial?.isLastActiveAdmin) || isSelf;

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message);
      if (mode === 'create' && 'id' in state && state.id) {
        router.push(`/admin/users/${state.id}`);
      } else {
        router.refresh();
      }
    } else if (state?.message) {
      toast.error(state.message);
    }
  }, [state, mode, router]);

  const groupedPermissions = permissions.reduce<Record<string, PermissionOption[]>>((acc, p) => {
    acc[p.group] = acc[p.group] ?? [];
    acc[p.group].push(p);
    return acc;
  }, {});

  return (
    <form action={action} className="flex w-full max-w-3xl flex-col gap-8">
      <FormSection title="Fiók adatok" description="Alap belépési adatok.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Név</Label>
            <Input id="name" name="name" defaultValue={initial?.name} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={initial?.email}
              required
              readOnly={mode === 'edit' && isSelf}
              disabled={mode === 'edit' && isSelf}
              className={mode === 'edit' && isSelf ? 'bg-muted' : undefined}
            />
            {mode === 'edit' && isSelf && (
              <p className="text-muted-foreground text-xs">Saját e-mail nem módosítható itt.</p>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2 sm:max-w-sm">
            <Label htmlFor="password">
              {mode === 'create' ? 'Jelszó' : 'Új jelszó (opcionális)'}
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              required={mode === 'create'}
              autoComplete="new-password"
              placeholder={mode === 'edit' ? 'Üresen hagyva nem változik' : undefined}
            />
            {state?.success === false && state.fieldErrors?.password && (
              <p className="text-destructive text-sm">{state.fieldErrors.password[0]}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id="isActive"
            name="isActive"
            defaultChecked={initial?.isActive ?? true}
            disabled={lockActive}
            value="true"
          />
          <Label htmlFor="isActive">Aktív felhasználó</Label>
          {lockActive && (
            <span className="text-muted-foreground text-xs">
              {isSelf
                ? 'Saját fiók nem inaktiválható.'
                : 'Az utolsó aktív admin nem inaktiválható.'}
            </span>
          )}
        </div>
      </FormSection>

      <Separator />

      <FormSection title="Szerepkörök" description="A szerepkörök jogosultság-csomagokat adnak.">
        <div className="border-border overflow-hidden rounded-md border">
          <div className="bg-muted/40 text-muted-foreground grid grid-cols-[2.5rem_1fr_6.5rem] items-center gap-2 border-b px-3 py-2 text-xs font-medium">
            <span aria-hidden />
            <span>Név</span>
            <span className="text-right">Típus</span>
          </div>
          <div className="divide-border divide-y">
            {roles.map((role) => {
              const checked = initial?.roleIds.includes(role.id) ?? false;
              const adminLocked = initial?.isLastActiveAdmin && role.key === 'admin' && checked;
              return (
                <label
                  key={role.id}
                  className="hover:bg-muted/30 grid cursor-pointer grid-cols-[2.5rem_1fr_6.5rem] items-center gap-2 px-3 py-2.5"
                >
                  <Checkbox
                    name="roleIds"
                    value={role.id}
                    defaultChecked={checked}
                    disabled={adminLocked}
                    className="justify-self-center"
                  />
                  <span className="text-sm font-medium">{role.name}</span>
                  <span className="flex justify-end gap-1">
                    {role.isSystem && (
                      <Badge variant="secondary" className="text-xs">
                        Rendszer
                      </Badge>
                    )}
                    {adminLocked && (
                      <Badge variant="outline" className="text-xs">
                        Kötelező
                      </Badge>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </FormSection>

      <Separator />

      <FormSection
        title="Közvetlen jogosultságok"
        description="Opcionális, a szerepkörökön felül. Csoportok szerint."
      >
        <PermissionGroupSections
          grouped={groupedPermissions}
          defaultOpen={false}
          renderPermission={(perm) => (
            <label
              key={perm.key}
              className="grid grid-cols-[auto_1fr] items-start gap-3 border-b py-2.5 last:border-0"
            >
              <Checkbox
                name="directPermissionKeys"
                value={perm.key}
                defaultChecked={initial?.directPermissionKeys.includes(perm.key)}
                className="mt-0.5"
              />
              <span className="text-sm leading-snug">
                <span className="font-medium">{perm.label}</span>
                <span className="text-muted-foreground block font-mono text-xs">{perm.key}</span>
              </span>
            </label>
          )}
        />
      </FormSection>

      {companies.length > 0 && (
        <>
          <Separator />
          <FormSection
            title="Dolgozói profil"
            description="Beosztás és kérelmek — automatikusan összekötve a fiókkal."
          >
            <EmployeeProfileFields
              companies={companies}
              defaultChecked
              initial={initial?.employee}
              showCheckbox={false}
              compact
            />
            {mode === 'edit' && initial?.employee && (
              <div className="flex items-center gap-2">
                <Checkbox id="unlinkEmployee" name="unlinkEmployee" value="true" />
                <Label htmlFor="unlinkEmployee" className="text-sm font-normal">
                  Dolgozói profil leválasztása (vendég rekord marad)
                </Label>
              </div>
            )}
          </FormSection>
        </>
      )}

      <div className="flex justify-end border-t pt-4">
        <Button type="submit" disabled={pending} size="lg">
          {pending ? 'Mentés…' : mode === 'create' ? 'Felhasználó létrehozása' : 'Mentés'}
        </Button>
      </div>
    </form>
  );
}
