'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { deleteSecretProjectAction } from '../actions';

export function DeleteSecretProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (!confirm('Biztosan törli a teljes titok projektet és minden kulcsot?')) return;
        startTransition(async () => {
          const result = await deleteSecretProjectAction(projectId);
          if (result.success) {
            toast.success(result.message);
            router.push('/secrets');
            router.refresh();
          } else {
            toast.error(result.message ?? 'Törlés sikertelen');
          }
        });
      }}
    >
      Projekt törlése
    </Button>
  );
}
