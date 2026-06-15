'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { inviteEmployeeAction, linkEmployeeByEmailAction, searchUsersAction } from '../actions';
import type { HrFormState } from '../../_components/form-utils';

type UserHit = { _id: string; name: string; email: string };

export function LinkAccountForm({
  employeeId,
  email,
  onSuccess,
}: {
  employeeId: string;
  email?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(email ?? '');
  const [hits, setHits] = useState<UserHit[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [searchPending, startSearch] = useTransition();
  const [emailPending, startEmailLink] = useTransition();
  const [state, action, pending] = useActionState(inviteEmployeeAction, {
    success: false,
  } as HrFormState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message ?? 'Összekötve.');
      router.refresh();
      onSuccess?.();
    } else if (state.message) toast.error(state.message);
  }, [state, router, onSuccess]);

  const onSearch = () => {
    if (query.trim().length < 2) return;
    startSearch(async () => {
      const results = await searchUsersAction(query.trim());
      setHits(results);
      if (results.length === 1) setSelectedUserId(results[0]!._id);
    });
  };

  const onEmailMatch = () => {
    startEmailLink(async () => {
      const res = await linkEmployeeByEmailAction(employeeId);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
        onSuccess?.();
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {email && (
        <div className="bg-muted/50 flex flex-col gap-2 rounded-lg border p-4">
          <p className="text-sm">
            Ha a dolgozó e-mailje (<strong>{email}</strong>) megegyezik egy meglévő CRM fiókéval,
            egy kattintással összekötheti.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="self-start"
            loading={emailPending}
            disabled={emailPending}
            onClick={onEmailMatch}
          >
            Összekötés e-mail alapján
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="userSearch">Vagy keressen másik felhasználót</Label>
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
            <option value="">Válasszon felhasználót…</option>
            {hits.map((h) => (
              <option key={h._id} value={h._id}>
                {h.name} ({h.email})
              </option>
            ))}
          </select>
        )}
      </div>

      <form action={action} className="flex flex-col gap-3 border-t pt-4">
        <input type="hidden" name="employeeId" value={employeeId} />
        <input type="hidden" name="mode" value="link_existing" />
        {selectedUserId && <input type="hidden" name="linkUserId" value={selectedUserId} />}
        <p className="text-muted-foreground text-sm">
          Új fiók csak akkor kell, ha még nincs CRM felhasználó. E-mail meghívóval is létrehozható.
        </p>
        <Button type="submit" loading={pending} disabled={pending || !selectedUserId}>
          Kiválasztott felhasználó összekötése
        </Button>
      </form>

      <details className="text-sm">
        <summary className="text-muted-foreground cursor-pointer">
          Új fiók / meghívó (haladó)
        </summary>
        <p className="text-muted-foreground mb-2 mt-2">
          Ha nincs még felhasználó, használja a dolgozó oldalon a teljes meghívó űrlapot.
        </p>
      </details>
    </div>
  );
}
