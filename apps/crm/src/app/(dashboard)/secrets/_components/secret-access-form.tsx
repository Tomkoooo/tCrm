'use client';

import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { updateSecretProjectAccessAction, type SecretFormState } from '../actions';

const initial: SecretFormState = { success: false };

type RoleOption = { id: string; name: string };
type UserOption = { id: string; name: string; email: string };

export function SecretAccessForm({
  projectId,
  roles,
  users,
  initialRoleIds,
  initialUserIds,
}: {
  projectId: string;
  roles: RoleOption[];
  users: UserOption[];
  initialRoleIds: string[];
  initialUserIds: string[];
}) {
  const boundAction = updateSecretProjectAccessAction.bind(null, projectId);
  const [state, action, pending] = useActionState(boundAction, initial);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Megosztás szerepkörökkel</legend>
        <p className="text-muted-foreground text-xs">
          A kiválasztott szerepkörök minden tagja olvashatja a projekt titkait (secrets:read
          szükséges).
        </p>
        <div className="flex max-h-40 flex-col gap-2 overflow-y-auto">
          {roles.map((role) => (
            <label key={role.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="allowedRoleIds"
                value={role.id}
                defaultChecked={initialRoleIds.includes(role.id)}
              />
              {role.name}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Megosztás felhasználókkal</legend>
        <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
          {users.map((user) => (
            <label key={user.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="allowedUserIds"
                value={user.id}
                defaultChecked={initialUserIds.includes(user.id)}
              />
              <span>
                {user.name} <span className="text-muted-foreground">({user.email})</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Button type="submit" disabled={pending}>
        {pending ? 'Mentés…' : 'Megosztás mentése'}
      </Button>
    </form>
  );
}
