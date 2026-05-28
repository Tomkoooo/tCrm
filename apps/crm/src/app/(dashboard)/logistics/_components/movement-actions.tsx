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
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await confirmMovementAction(id);
            if (!result.success) {
              alert(result.message ?? 'Failed to confirm');
            }
            router.refresh();
          })
        }
      >
        Confirm
      </Button>
      <Button
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await cancelMovementAction(id);
            if (!result.success) {
              alert(result.message ?? 'Failed to cancel');
            }
            router.refresh();
          })
        }
      >
        Cancel draft
      </Button>
    </div>
  );
}
