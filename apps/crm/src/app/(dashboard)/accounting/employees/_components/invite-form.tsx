'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { inviteEmployeeAction, searchUsersAction } from '../actions';
import type { HrFormState } from '../../_components/form-utils';

type UserHit = { _id: string; name: string; email: string };

export function InviteEmployeeForm({
  employeeId,
  email,
  onSuccess,
}: {
  employeeId: string;
  email?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<'link_existing' | 'password' | 'email_invite'>('link_existing');
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<UserHit[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [searchPending, startSearch] = useTransition();
  const [state, action, pending] = useActionState(inviteEmployeeAction, {
    success: false,
  } as HrFormState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message ?? 'Meghívva.');
      router.refresh();
      onSuccess?.();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, router, onSuccess]);

  const onSearch = () => {
    if (query.trim().length < 2) return;
    startSearch(async () => {
      const results = await searchUsersAction(query.trim());
      setHits(results);
      if (results.length === 1) setSelectedUserId(results[0]!._id);
    });
  };

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="employeeId" value={employeeId} />
      <input type="hidden" name="mode" value={mode} />
      {selectedUserId && mode === 'link_existing' && (
        <input type="hidden" name="linkUserId" value={selectedUserId} />
      )}

      <p className="text-muted-foreground text-sm">
        E-mail: <strong>{email ?? '—'}</strong> (a dolgozó rekordból)
      </p>

      <div className="space-y-2">
        <Label>Módszer</Label>
        <select
          className="border-input bg-background h-9 w-full rounded-md border px-2"
          value={mode}
          onChange={(e) => setMode(e.target.value as 'link_existing' | 'password' | 'email_invite')}
        >
          <option value="link_existing">Meglévő CRM felhasználó összekötése</option>
          <option value="email_invite">E-mail meghívó (új vagy cégcsatlakozás)</option>
          <option value="password">Új fiók jelszóval (legacy)</option>
        </select>
      </div>

      {mode === 'link_existing' && (
        <div className="space-y-2">
          <Label htmlFor="userSearch">Felhasználó keresése</Label>
          <div className="flex gap-2">
            <Input
              id="userSearch"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Név vagy e-mail…"
            />
            <Button type="button" variant="outline" onClick={onSearch} disabled={searchPending}>
              Keresés
            </Button>
          </div>
          {hits.length > 0 && (
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-2"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">Válasszon…</option>
              {hits.map((h) => (
                <option key={h._id} value={h._id}>
                  {h.name} ({h.email})
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {mode === 'password' && (
        <div className="space-y-2">
          <Label htmlFor="password">Kezdeti jelszó</Label>
          <Input id="password" name="password" type="password" minLength={8} />
          {state.success === false && state.fieldErrors?.password && (
            <p className="text-destructive text-sm">{state.fieldErrors.password[0]}</p>
          )}
        </div>
      )}

      {mode === 'email_invite' && (
        <p className="text-muted-foreground text-sm">
          E-mail meghívót küldünk. Ha a cím már regisztrált, cégcsatlakozási meghívó lesz.
        </p>
      )}

      <Button type="submit" disabled={pending || !email}>
        {pending
          ? 'Feldolgozás…'
          : mode === 'link_existing'
            ? 'Felhasználó összekötése'
            : mode === 'email_invite'
              ? 'Meghívó küldése'
              : 'Felhasználó létrehozása'}
      </Button>
    </form>
  );
}
