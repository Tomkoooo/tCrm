'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@crm/ui';
import { releaseReservationsByRefAction } from '../actions';

export function ReservationGroupActions({ sourceRef }: { sourceRef: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (reason: 'fulfilled' | 'cancelled') => {
    startTransition(async () => {
      const result = await releaseReservationsByRefAction(sourceRef, reason);
      if (!result.success) {
        alert(result.message ?? 'Hiba');
      }
      router.refresh();
    });
  };

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        loading={pending}
        disabled={pending}
        onClick={() => run('fulfilled')}
      >
        Teljesítés
      </Button>
      <Button
        size="sm"
        variant="ghost"
        loading={pending}
        disabled={pending}
        onClick={() => run('cancelled')}
      >
        Törlés
      </Button>
    </div>
  );
}
