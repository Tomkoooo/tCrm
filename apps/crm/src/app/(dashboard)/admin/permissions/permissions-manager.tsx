'use client';

import { useActionState, useTransition } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  toggleRolePermissionAction,
  createRoleAction,
  deleteRoleAction,
  type PermissionsFormState,
} from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Permission = {
  id: string;
  key: string;
  label: string;
  group: string;
};

type Role = {
  id: string;
  key: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissionIds: string[];
};

const initialState: PermissionsFormState = { success: false, message: '' };

function PermissionToggle({
  roleId,
  permissionId,
  enabled,
  disabled,
}: {
  roleId: string;
  permissionId: string;
  enabled: boolean;
  disabled?: boolean;
}) {
  const [, startTransition] = useTransition();

  const handleChange = (checked: boolean) => {
    const formData = new FormData();
    formData.set('roleId', roleId);
    formData.set('permissionId', permissionId);
    formData.set('enabled', String(checked));

    startTransition(async () => {
      const result = await toggleRolePermissionAction(initialState, formData);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <Checkbox
      checked={enabled}
      disabled={disabled}
      onCheckedChange={handleChange}
      aria-label="Toggle permission"
    />
  );
}

function RolePermissionsCard({
  role,
  groupedPermissions,
}: {
  role: Role;
  groupedPermissions: Record<string, Permission[]>;
}) {
  const enabledCount = role.permissionIds.length;

  return (
    <Collapsible defaultOpen={false}>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <CollapsibleTrigger className="flex min-w-0 flex-1 items-start gap-2 text-left [&[data-state=open]>svg]:rotate-180">
            <ChevronDownIcon className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0 transition-transform" />
            <div className="min-w-0 flex-1">
              <CardTitle className="flex flex-wrap items-center gap-2">
                {role.name}
                {role.isSystem && <Badge variant="secondary">Rendszer</Badge>}
                <Badge variant="outline" className="font-normal">
                  {enabledCount} jog
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1">
                {role.description ?? role.key}
                {role.isSystem && role.key === 'admin' && ' — jogosultságok zárolva'}
              </CardDescription>
            </div>
          </CollapsibleTrigger>
          {!role.isSystem && (
            <form
              action={async (formData) => {
                const result = await deleteRoleAction(initialState, formData);
                if (result.success) toast.success(result.message);
                else toast.error(result.message);
              }}
            >
              <input type="hidden" name="roleId" value={role.id} />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
              >
                Törlés
              </Button>
            </form>
          )}
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jogosultság</TableHead>
                  <TableHead>Kulcs</TableHead>
                  <TableHead className="w-24 text-center">Engedélyezve</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedPermissions).flatMap(([group, perms]) =>
                  perms.map((perm) => (
                    <TableRow key={`${role.id}-${perm.id}`}>
                      <TableCell>
                        <span className="font-medium">{perm.label}</span>
                        <span className="text-muted-foreground ml-2 text-xs">({group})</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{perm.key}</TableCell>
                      <TableCell className="text-center">
                        <PermissionToggle
                          roleId={role.id}
                          permissionId={perm.id}
                          enabled={role.permissionIds.includes(perm.id)}
                          disabled={role.isSystem && role.key === 'admin'}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function PermissionsManager({
  permissions,
  roles,
}: {
  permissions: Permission[];
  roles: Role[];
}) {
  const [createState, createAction, createPending] = useActionState(createRoleAction, initialState);

  const groupedPermissions = permissions.reduce<Record<string, Permission[]>>((acc, perm) => {
    acc[perm.group] = acc[perm.group] ?? [];
    acc[perm.group].push(perm);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Új szerepkör</CardTitle>
          <CardDescription>Egyedi szerepkör jogosultságokkal</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createAction} className="flex max-w-2xl flex-col gap-4">
            {createState.success === false && createState.message && (
              <p className="text-destructive text-sm">{createState.message}</p>
            )}
            {createState.success && createState.message && (
              <p className="text-sm text-green-600">{createState.message}</p>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="key">Kulcs</Label>
                <Input id="key" name="key" placeholder="sales_rep" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Név</Label>
                <Input id="name" name="name" placeholder="Értékesítő" required />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Leírás</Label>
              <Input id="description" name="description" placeholder="Opcionális" />
            </div>
            <Button type="submit" disabled={createPending}>
              {createPending ? 'Létrehozás…' : 'Szerepkör létrehozása'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className={cn('flex flex-col gap-3')}>
        {roles.map((role) => (
          <RolePermissionsCard key={role.id} role={role} groupedPermissions={groupedPermissions} />
        ))}
      </div>
    </div>
  );
}
