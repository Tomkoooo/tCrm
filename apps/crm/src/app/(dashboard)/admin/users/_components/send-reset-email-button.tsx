'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { sendPasswordResetAction } from '../actions';

export function SendResetEmailButton({ userId }: { userId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await sendPasswordResetAction(userId);
          if (result.success) {
            toast.success(result.message);
          } else {
            toast.error(result.message ?? 'Hiba történt.');
          }
        });
      }}
    >
      {pending ? 'Küldés…' : 'Jelszó-visszaállító e-mail'}
    </Button>
  );
}
