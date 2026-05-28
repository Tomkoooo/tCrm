'use client';

import { useState } from 'react';
import { EntitySheet } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { ReservationGroupForm } from '../../_components/reservation-group-form';
import { ReservationsLinesTable, type ReservationLineRow } from './reservations-lines-table';

export function ReservationsPageClient({
  lines,
  canWrite,
  warehouses,
}: {
  lines: ReservationLineRow[];
  canWrite: boolean;
  warehouses: Array<{ _id: string; key: string; name: string }>;
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      {canWrite && (
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
            Új foglalás
          </Button>
        </div>
      )}
      <ReservationsLinesTable data={lines} />
      {canWrite && (
        <>
          <EntitySheet
            open={createOpen}
            onOpenChange={setCreateOpen}
            title="Új foglalás"
            size="lg"
            mode="create"
          >
            <ReservationGroupForm warehouses={warehouses} onSuccess={() => setCreateOpen(false)} />
          </EntitySheet>
        </>
      )}
    </>
  );
}
