'use client';

import { useActionState, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Share2Icon, XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SearchAutocomplete } from '@/components/ui/search-autocomplete';
import {
  searchUsersForSecretAccessAction,
  updateSecretProjectAccessAction,
  type SecretFormState,
} from '../actions';

const initial: SecretFormState = { success: false };

type RoleOption = { id: string; name: string };
type UserOption = { id: string; name: string; email: string };

export function SecretAccessDialog({
  projectId,
  roles,
  initialUsers,
  initialRoleIds,
  initialUserIds,
}: {
  projectId: string;
  roles: RoleOption[];
  initialUsers: UserOption[];
  initialRoleIds: string[];
  initialUserIds: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState<UserOption[]>(initialUsers);
  const boundAction = updateSecretProjectAccessAction.bind(null, projectId);
  const [state, action, pending] = useActionState(boundAction, initial);

  useEffect(() => {
    if (!open) return;
    setFormKey((k) => k + 1);
    setSelectedUsers(initialUsers);
  }, [open, initialUsers]);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      setOpen(false);
      router.refresh();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, router]);

  const handleUserSearch = useCallback(async (query: string) => {
    return searchUsersForSecretAccessAction(query);
  }, []);

  const addUser = (item: { value: string; label: string; sublabel?: string }) => {
    if (selectedUsers.some((u) => u.id === item.value)) return;
    setSelectedUsers((prev) => [
      ...prev,
      {
        id: item.value,
        name: item.label,
        email: item.sublabel ?? '',
      },
    ]);
  };

  const removeUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const sharedCount = initialRoleIds.length + initialUserIds.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Share2Icon className="mr-2 h-4 w-4" />
          Megosztás kezelése
          {sharedCount > 0 && (
            <span className="bg-muted text-muted-foreground ml-2 rounded-full px-2 py-0.5 text-xs">
              {sharedCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Megosztás</DialogTitle>
          <DialogDescription>
            Alapértelmezetten privát: csak a létrehozó és a secrets:manage jogú felhasználók látják.
            Itt adhat hozzá szerepköröket és felhasználókat.
          </DialogDescription>
        </DialogHeader>

        <form key={formKey} action={action} className="flex flex-col gap-4">
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
            <SearchAutocomplete
              placeholder="Felhasználó keresése név vagy e-mail alapján…"
              onSearch={handleUserSearch}
              onSelect={addUser}
              minChars={1}
            />
            {selectedUsers.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {selectedUsers.map((user) => (
                  <li
                    key={user.id}
                    className="bg-muted/50 flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm"
                  >
                    <input type="hidden" name="allowedUserIds" value={user.id} />
                    <span className="wrap-break-word min-w-0">
                      {user.name} <span className="text-muted-foreground">({user.email})</span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      title="Eltávolítás"
                      onClick={() => removeUser(user.id)}
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-xs">Nincs egyedi felhasználó megosztva.</p>
            )}
          </fieldset>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Mégse
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Mentés…' : 'Megosztás mentése'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
