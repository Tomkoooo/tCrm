'use client';

import { useActionState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@crm/ui';
import { magicSignInAction, type MagicLinkState } from './actions';

const initial: MagicLinkState = { success: false, message: '' };

/**
 * Submits the token automatically on mount so the recipient never sees a form —
 * but through a real form POST, not a GET side effect, so a link pre-fetched by a
 * mail client or scanner does not silently create a session.
 */
export function MagicLinkForm({ token, redirectTo }: { token: string; redirectTo: string }) {
  const [state, action, pending] = useActionState(magicSignInAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);

  useEffect(() => {
    if (submitted.current) return;
    submitted.current = true;
    formRef.current?.requestSubmit();
  }, []);

  const failed = Boolean(state.message);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div>
        <h1 className="text-2xl font-bold">{failed ? 'Belépés sikertelen' : 'Belépés…'}</h1>
        <p className="text-muted-foreground text-sm">
          {failed ? state.message : 'Egy pillanat, beléptetünk és megnyitjuk a beosztásodat.'}
        </p>
      </div>

      {failed ? (
        <div className="flex flex-col gap-2">
          <Button asChild>
            <Link href="/login">Bejelentkezés jelszóval</Link>
          </Button>
          <Button type="submit" variant="outline" loading={pending} loadingText="Újrapróbálás…">
            Újrapróbálom
          </Button>
        </div>
      ) : (
        <Button type="submit" loading={pending} loadingText="Belépés…">
          Belépés
        </Button>
      )}
    </form>
  );
}
