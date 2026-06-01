'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { VehicleIncidentListItem } from '@crm/core';
import { markVehicleIncidentFixedAction } from '../actions';

function IncidentStatusBadge({ status }: { status: 'reported' | 'fixed' }) {
  return (
    <span
      className={
        status === 'fixed'
          ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800'
          : 'rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800'
      }
    >
      {status === 'fixed' ? 'Lezárva' : 'Nyitott'}
    </span>
  );
}

export function VehicleIncidentsList({
  vehicleId,
  incidents,
  canMarkFixed,
}: {
  vehicleId: string;
  incidents: VehicleIncidentListItem[];
  canMarkFixed: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const markFixed = (incidentId: string) => {
    startTransition(async () => {
      const result = await markVehicleIncidentFixedAction(vehicleId, incidentId);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message ?? 'Hiba történt.');
      }
    });
  };

  if (incidents.length === 0) {
    return <p className="text-muted-foreground text-sm">Még nincs incidens ehhez a járműhöz.</p>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {incidents.map((incident) => (
        <li key={incident.id} className="rounded-md border p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <IncidentStatusBadge status={incident.status} />
              <span className="text-muted-foreground text-xs">
                {format(new Date(incident.createdAt), 'yyyy. MMM d. HH:mm', { locale: hu })}
              </span>
            </div>
            {canMarkFixed && incident.status === 'reported' && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                loading={pending}
                disabled={pending}
                onClick={() => markFixed(incident.id)}
              >
                Lezárva
              </Button>
            )}
          </div>
          <p className="whitespace-pre-wrap text-sm">{incident.description}</p>
          <p className="text-muted-foreground mt-2 text-xs">
            Bejelentő: {incident.reportedByName}
            {incident.fixedByName && ` · Lezárta: ${incident.fixedByName}`}
            {incident.fixedAt &&
              ` · ${format(new Date(incident.fixedAt), 'yyyy. MMM d. HH:mm', { locale: hu })}`}
          </p>
          {incident.photoIds.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {incident.photoIds.map((photoId) => (
                <li key={photoId}>
                  <a
                    href={`/api/inventory/images/${photoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block overflow-hidden rounded-md border"
                  >
                    <img
                      src={`/api/inventory/images/${photoId}`}
                      alt="Incidens fotó"
                      className="size-20 object-cover"
                    />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
