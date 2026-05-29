'use client';

import { useActionState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createVehicleAction, type VehicleFormState } from '../actions';

const initialState: VehicleFormState = { success: false };

export function CreateVehicleForm({ onSuccess }: { onSuccess?: () => void }) {
  const [state, action, pending] = useActionState(createVehicleAction, initialState);

  useEffect(() => {
    if (state.success) onSuccess?.();
  }, [state.success, onSuccess]);

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.message && !state.success && <p className="text-sm text-red-600">{state.message}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Megnevezés</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="plateNumber">Rendszám</Label>
          <Input id="plateNumber" name="plateNumber" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="lengthMm">Raktér hossz (mm)</Label>
          <Input id="lengthMm" name="lengthMm" type="number" min={1} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="widthMm">Raktér szélesség (mm)</Label>
          <Input id="widthMm" name="widthMm" type="number" min={1} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="heightMm">Raktér magasság (mm)</Label>
          <Input id="heightMm" name="heightMm" type="number" min={1} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="maxWeightKg">Max. súly (kg)</Label>
          <Input
            id="maxWeightKg"
            name="maxWeightKg"
            type="number"
            step="any"
            min={0.001}
            required
          />
        </div>
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="maxVolumeM3">Max. térfogat (m³)</Label>
          <Input
            id="maxVolumeM3"
            name="maxVolumeM3"
            type="number"
            step="any"
            min={0.000001}
            required
          />
        </div>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" name="isActive" defaultChecked className="size-4" />
          Aktív
        </label>
      </div>
      <Button type="submit" disabled={pending}>
        Mentés
      </Button>
    </form>
  );
}
