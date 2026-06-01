'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cancelMovementAction, confirmMovementAction } from '../actions';

export function MovementActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (status !== 'draft') return null;

  return (
    <div className="flex gap-2">
      <Button
        loading={pending}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await confirmMovementAction(id);
            if (!result.success) {
              alert(result.message ?? 'Megerősítés sikertelen');
            }
            router.refresh();
          })
        }
      >
        Megerősítés
      </Button>
      <Button
        variant="outline"
        loading={pending}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await cancelMovementAction(id);
            if (!result.success) {
              alert(result.message ?? 'Visszavonás sikertelen');
            }
            router.refresh();
          })
        }
      >
        Tervezet visszavonása
      </Button>
    </div>
  );
}
