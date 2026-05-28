'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  initial?: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    roleIds: string[];
    directPermissionKeys: string[];
    isLastActiveAdmin?: boolean;
  };
  currentUserId?: string;
};

export function UserForm({ mode, roles, permissions, initial, currentUserId }: UserFormProps) {
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
    <form action={action} className="flex max-w-2xl flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2">
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
      </div>

      {mode === 'create' ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Jelszó</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
          />
          {state?.success === false && state.fieldErrors?.password && (
            <p className="text-destructive text-sm">{state.fieldErrors.password[0]}</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Új jelszó (opcionális)</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Üresen hagyva nem változik"
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isActive"
          name="isActive"
          defaultChecked={initial?.isActive ?? true}
          disabled={lockActive}
          value="true"
        />
        <Label htmlFor="isActive">Aktív felhasználó</Label>
        {lockActive && (
          <span className="text-muted-foreground text-xs">
            {isSelf ? 'Saját fiók nem inaktiválható.' : 'Az utolsó aktív admin nem inaktiválható.'}
          </span>
        )}
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium">Szerepkörök</legend>
        <div className="flex flex-col gap-2">
          {roles.map((role) => {
            const checked = initial?.roleIds.includes(role.id) ?? false;
            const adminLocked = initial?.isLastActiveAdmin && role.key === 'admin' && checked;
            return (
              <label key={role.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="roleIds"
                  value={role.id}
                  defaultChecked={checked}
                  disabled={adminLocked}
                />
                <span>{role.name}</span>
                {role.isSystem && (
                  <Badge variant="secondary" className="text-xs">
                    Rendszer
                  </Badge>
                )}
                {adminLocked && <span className="text-muted-foreground text-xs">(kötelező)</span>}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="text-sm font-medium">Közvetlen jogosultságok (opcionális)</legend>
        {Object.entries(groupedPermissions).map(([group, perms]) => (
          <div key={group} className="flex flex-col gap-2">
            <h3 className="text-muted-foreground text-xs font-medium uppercase">{group}</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {perms.map((perm) => (
                <label key={perm.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="directPermissionKeys"
                    value={perm.key}
                    defaultChecked={initial?.directPermissionKeys.includes(perm.key)}
                  />
                  <span>{perm.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </fieldset>

      <Button type="submit" disabled={pending}>
        {pending ? 'Mentés…' : mode === 'create' ? 'Felhasználó létrehozása' : 'Mentés'}
      </Button>
    </form>
  );
}
