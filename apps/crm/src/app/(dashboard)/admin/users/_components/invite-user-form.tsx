'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { EmployeeProfileFields, type CompanyOption } from '@/components/hr/employee-profile-fields';
import { PermissionGroupSections } from '@/components/admin/permission-group-sections';
import { inviteUserAction, type UserFormState } from '../actions';

type RoleOption = {
  id: string;
  key: string;
  name: string;
  isSystem: boolean;
};

type PermissionOption = {
  key: string;
  label: string;
  group: string;
};

export function InviteUserForm({
  roles,
  permissions,
  companies,
}: {
  roles: RoleOption[];
  permissions: PermissionOption[];
  companies: CompanyOption[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(inviteUserAction, {
    success: false,
  } satisfies UserFormState);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message);
      router.push('/admin/users');
    } else if (state?.message) {
      toast.error(state.message);
    }
  }, [state, router]);

  const groupedPermissions = permissions.reduce<Record<string, PermissionOption[]>>((acc, p) => {
    acc[p.group] = acc[p.group] ?? [];
    acc[p.group].push(p);
    return acc;
  }, {});

  return (
    <form action={action} className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="invite-name">Név</Label>
          <Input id="invite-name" name="name" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="invite-email">E-mail</Label>
          <Input id="invite-email" name="email" type="email" required />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2 sm:max-w-xs">
          <Label htmlFor="expiresInDays">Link érvényessége (nap)</Label>
          <Input
            id="expiresInDays"
            name="expiresInDays"
            type="number"
            min={1}
            max={30}
            defaultValue={7}
          />
        </div>
      </div>

      <Separator />

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Szerepkörök</h2>
        <div className="border-border divide-y rounded-md border">
          {roles.map((role) => (
            <label
              key={role.id}
              className="hover:bg-muted/30 flex cursor-pointer items-center gap-3 px-3 py-2"
            >
              <Checkbox name="roleIds" value={role.id} />
              <span className="text-sm font-medium">{role.name}</span>
            </label>
          ))}
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Közvetlen jogosultságok</h2>
        <PermissionGroupSections
          grouped={groupedPermissions}
          defaultOpen={false}
          renderPermission={(perm) => (
            <label
              key={perm.key}
              className="grid grid-cols-[auto_1fr] items-start gap-3 border-b py-2.5 last:border-0"
            >
              <Checkbox name="directPermissionKeys" value={perm.key} className="mt-0.5" />
              <span className="text-sm leading-snug">
                <span className="font-medium">{perm.label}</span>
              </span>
            </label>
          )}
        />
      </section>

      {companies.length > 0 && (
        <>
          <Separator />
          <EmployeeProfileFields
            companies={companies}
            defaultChecked={false}
            checkboxName="isEmployee"
            checkboxLabel="Dolgozói profil a meghívóban"
          />
        </>
      )}

      <div className="flex justify-end border-t pt-4">
        <Button type="submit" disabled={pending} size="lg">
          {pending ? 'Küldés…' : 'Meghívó küldése'}
        </Button>
      </div>
    </form>
  );
}
