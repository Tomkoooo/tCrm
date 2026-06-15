'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MediaSelector } from '@/components/media/media-selector';
import type { SelectedMedia } from '@/lib/media-types';
import { updateVehicleAction, type VehicleFormState } from '../actions';

type CompanyOption = { _id: string; name: string };

function mediaFromIds(ids: string[], labelPrefix: string): SelectedMedia[] {
  return ids.map((id, index) => ({
    id,
    previewUrl: `/api/inventory/images/${id}`,
    filename: `${labelPrefix} ${index + 1}`,
    type: 'file' as const,
  }));
}

function mediaFromId(id: string | undefined, label: string): SelectedMedia[] {
  if (!id) return [];
  return [
    {
      id,
      previewUrl: `/api/inventory/images/${id}`,
      filename: label,
      type: 'file',
    },
  ];
}

function formatDateInput(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function EditVehicleForm({
  vehicle,
  companies,
}: {
  vehicle: {
    _id: string;
    name: string;
    plateNumber: string;
    lengthMm: number;
    widthMm: number;
    heightMm: number;
    maxWeightKg: number;
    maxVolumeM3: number;
    isActive: boolean;
    companyId?: string;
    registrationDueDate?: string;
    insuranceDueDate?: string;
    imageIds: string[];
    licenseFileId?: string;
    registrationFileId?: string;
    insuranceFileId?: string;
  };
  companies: CompanyOption[];
}) {
  const router = useRouter();
  const bound = updateVehicleAction.bind(null, vehicle._id);
  const [state, action, pending] = useActionState(bound, { success: false } as VehicleFormState);

  const [images, setImages] = useState<SelectedMedia[]>(() =>
    mediaFromIds(vehicle.imageIds, 'Kép')
  );
  const [license, setLicense] = useState<SelectedMedia[]>(() =>
    mediaFromId(vehicle.licenseFileId, 'Jogosítvány')
  );
  const [registration, setRegistration] = useState<SelectedMedia[]>(() =>
    mediaFromId(vehicle.registrationFileId, 'Forgalmi')
  );
  const [insurance, setInsurance] = useState<SelectedMedia[]>(() =>
    mediaFromId(vehicle.insuranceFileId, 'Biztosítás')
  );

  useEffect(() => {
    if (state.success) {
      toast.success(state.message ?? 'Mentve.');
      router.refresh();
    } else if (state.message && !state.success) {
      toast.error(state.message);
    }
  }, [state, router]);

  return (
    <form action={action} className="flex flex-col gap-6">
      <section className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Megnevezés</Label>
          <Input id="name" name="name" defaultValue={vehicle.name} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="plateNumber">Rendszám</Label>
          <Input id="plateNumber" name="plateNumber" defaultValue={vehicle.plateNumber} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="companyId">Tulajdonos cég</Label>
          <select
            id="companyId"
            name="companyId"
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
            defaultValue={vehicle.companyId ?? ''}
          >
            <option value="">Nincs</option>
            {companies.map((company) => (
              <option key={company._id} value={company._id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="lengthMm">Raktér hossz (mm)</Label>
          <Input
            id="lengthMm"
            name="lengthMm"
            type="number"
            min={1}
            defaultValue={vehicle.lengthMm}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="widthMm">Raktér szélesség (mm)</Label>
          <Input
            id="widthMm"
            name="widthMm"
            type="number"
            min={1}
            defaultValue={vehicle.widthMm}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="heightMm">Raktér magasság (mm)</Label>
          <Input
            id="heightMm"
            name="heightMm"
            type="number"
            min={1}
            defaultValue={vehicle.heightMm}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="maxWeightKg">Max. súly (kg)</Label>
          <Input
            id="maxWeightKg"
            name="maxWeightKg"
            type="number"
            step="any"
            min={0.001}
            defaultValue={vehicle.maxWeightKg}
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
            defaultValue={vehicle.maxVolumeM3}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="registrationDueDate">Forgalmi engedély lejárat</Label>
          <Input
            id="registrationDueDate"
            name="registrationDueDate"
            type="date"
            defaultValue={formatDateInput(vehicle.registrationDueDate)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="insuranceDueDate">Biztosítás lejárat</Label>
          <Input
            id="insuranceDueDate"
            name="insuranceDueDate"
            type="date"
            defaultValue={formatDateInput(vehicle.insuranceDueDate)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={vehicle.isActive}
            className="size-4"
          />
          Aktív
        </label>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">Képek és dokumentumok</h2>
        <MediaSelector
          label="Jármű képek"
          value={images}
          onChange={setImages}
          multiple
          maxCount={10}
        />
        <input type="hidden" name="licenseFileId" value={license[0]?.id ?? ''} />
        <MediaSelector
          label="Jogosítvány (fájl/kép)"
          value={license}
          onChange={setLicense}
          multiple={false}
          maxCount={1}
        />
        <input type="hidden" name="registrationFileId" value={registration[0]?.id ?? ''} />
        <MediaSelector
          label="Forgalmi engedély"
          value={registration}
          onChange={setRegistration}
          multiple={false}
          maxCount={1}
        />
        <input type="hidden" name="insuranceFileId" value={insurance[0]?.id ?? ''} />
        <MediaSelector
          label="Biztosítás"
          value={insurance}
          onChange={setInsurance}
          multiple={false}
          maxCount={1}
        />
      </section>

      <Button type="submit" loading={pending} disabled={pending} className="w-fit">
        {pending ? 'Mentés…' : 'Mentés'}
      </Button>
    </form>
  );
}
