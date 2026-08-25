'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@crm/ui';
import { cancelJobAction, scheduleJobAction } from '../actions';
import type { JobStatus } from '@crm/db-core';

export function JobActionsBar({
  jobId,
  status,
  canEdit,
}: {
  jobId: string;
  status: JobStatus;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (!canEdit) return null;
  if (status !== 'draft' && status !== 'scheduled') return null;

  const runSchedule = () => {
    startTransition(async () => {
      const res = await scheduleJobAction(jobId);
      setMessage(res.message ?? null);
      if (res.success) router.refresh();
    });
  };

  const runCancel = () => {
    startTransition(async () => {
      const res = await cancelJobAction(jobId);
      setMessage(res.message ?? null);
      if (res.success) router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {message && <p className="text-sm">{message}</p>}
      <div className="flex flex-wrap gap-2">
        {status === 'draft' && (
          <Button size="sm" disabled={pending} onClick={runSchedule}>
            Ütemezés és értesítés
          </Button>
        )}
        <Button size="sm" variant="destructive" disabled={pending} onClick={runCancel}>
          Esemény törlése
        </Button>
      </div>
    </div>
  );
}
