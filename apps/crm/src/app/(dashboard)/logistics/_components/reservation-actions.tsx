'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@crm/ui';
import { releaseReservationAction } from '../actions';

export function ReservationActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        loading={pending}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await releaseReservationAction(id, 'fulfilled');
            if (!result.success) alert(result.message ?? 'Failed');
            router.refresh();
          })
        }
      >
        Fulfill
      </Button>
      <Button
        size="sm"
        variant="ghost"
        loading={pending}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await releaseReservationAction(id, 'cancelled');
            if (!result.success) alert(result.message ?? 'Failed');
            router.refresh();
          })
        }
      >
        Cancel
      </Button>
    </div>
  );
}
