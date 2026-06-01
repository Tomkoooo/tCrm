'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { unlinkEmployeeAction } from '../actions';

export function UnlinkEmployeeButton({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      loading={pending}
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const res = await unlinkEmployeeAction(employeeId);
          if (res.success) {
            toast.success(res.message);
            router.refresh();
          } else {
            toast.error(res.message ?? 'Hiba');
          }
        });
      }}
    >
      Fiók leválasztása
    </Button>
  );
}
