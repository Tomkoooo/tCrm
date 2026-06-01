'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MediaSelector } from '@/components/media/media-selector';
import type { SelectedMedia } from '@/lib/media-types';
import { reportVehicleIncidentAction, type VehicleFormState } from '../actions';

export function VehicleIncidentReportForm({ vehicleId }: { vehicleId: string }) {
  const router = useRouter();
  const bound = reportVehicleIncidentAction.bind(null, vehicleId);
  const [state, action, pending] = useActionState(bound, { success: false } as VehicleFormState);
  const [photos, setPhotos] = useState<SelectedMedia[]>([]);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message ?? 'Incidens bejelentve.');
      setPhotos([]);
      router.refresh();
    } else if (state.message && !state.success) {
      toast.error(state.message);
    }
  }, [state, router]);

  return (
    <form action={action} className="flex flex-col gap-4 rounded-md border p-4">
      <div>
        <h3 className="text-sm font-semibold">Új incidens / viselkedés bejelentése</h3>
        <p className="text-muted-foreground text-xs">
          Leírás és opcionális fotók a logisztika felé.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Leírás</Label>
        <Textarea id="description" name="description" rows={4} required />
        {state.success === false && state.fieldErrors?.description && (
          <p className="text-destructive text-sm">{state.fieldErrors.description[0]}</p>
        )}
      </div>
      <MediaSelector
        label="Fotók (opcionális)"
        value={photos}
        onChange={setPhotos}
        multiple
        maxCount={5}
        name="incidentPhotoId"
      />
      <Button type="submit" loading={pending} disabled={pending} className="w-fit">
        {pending ? 'Küldés…' : 'Bejelentés küldése'}
      </Button>
    </form>
  );
}
