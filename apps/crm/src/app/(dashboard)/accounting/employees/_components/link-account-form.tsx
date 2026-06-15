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
  const [query, setQuery] = useState('');
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
      setSelectedUserId('');
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
    <div className="flex flex-col gap-5">
      {email && (
        <div className="bg-muted/50 rounded-lg border p-4">
          <p className="mb-2 text-sm font-medium">Gyors összekötés</p>
          <p className="text-muted-foreground mb-3 text-sm">
            Ha a dolgozó e-mailje (<code className="bg-muted rounded px-1">{email}</code>) már
            létezik CRM fiókként:
          </p>
          <Button
            type="button"
            size="sm"
            loading={emailPending}
            disabled={emailPending}
            onClick={onEmailMatch}
          >
            Összekötés e-mail alapján
          </Button>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-sm font-medium">Keresés név vagy e-mail alapján</p>
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Írjon be nevet vagy e-mailt…"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onSearch())}
          />
          <Button
            type="button"
            variant="outline"
            onClick={onSearch}
            loading={searchPending}
            disabled={searchPending || query.trim().length < 2}
          >
            Keresés
          </Button>
        </div>

        {hits.length > 0 && (
          <div className="space-y-2">
            <Label>Találatok</Label>
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
          </div>
        )}

        {hits.length === 0 && query.trim().length >= 2 && !searchPending && (
          <p className="text-muted-foreground text-sm">
            Nincs találat. Ha a személy még nem CRM felhasználó, használja a „Meghívó / új fiók"
            gombot.
          </p>
        )}
      </div>

      {selectedUserId && (
        <form action={action}>
          <input type="hidden" name="employeeId" value={employeeId} />
          <input type="hidden" name="mode" value="link_existing" />
          <input type="hidden" name="linkUserId" value={selectedUserId} />
          <Button type="submit" loading={pending} disabled={pending}>
            Összekötés
          </Button>
        </form>
      )}
    </div>
  );
}
