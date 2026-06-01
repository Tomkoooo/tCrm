'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MediaSelector } from '@/components/media/media-selector';
import type { SelectedMedia } from '@/lib/media-types';
import type { InventoryFormState } from '../actions';
import { ProductFormExcelSections } from './product-form-excel';
import { ProductWarehouseFields } from './product-warehouse-fields';

export function ProductForm({
  mode,
  action,
  initialMedia,
  warehouses = [],
  initialWarehouseIds = [],
}: {
  mode: 'create' | 'edit';
  action: (prev: InventoryFormState, formData: FormData) => Promise<InventoryFormState>;
  initialSku?: string;
  initialMedia?: SelectedMedia[];
  warehouses?: Array<{ id: string; name: string; key: string }>;
  initialWarehouseIds?: string[];
}) {
  const router = useRouter();
  const [media, setMedia] = useState<SelectedMedia[]>(initialMedia ?? []);
  const [state, formAction, pending] = useActionState(action, {
    success: false,
  } as InventoryFormState);

  useEffect(() => {
    if (state.success && state.sku) {
      router.push(`/inventory/${state.sku}`);
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.success === false && state.message && (
        <p className="text-destructive text-sm">{state.message}</p>
      )}
      {state.success === false && state.fieldErrors && (
        <ul className="text-destructive list-inside list-disc text-sm">
          {Object.entries(state.fieldErrors).map(([k, msgs]) => (
            <li key={k}>
              {k}: {msgs.join(', ')}
            </li>
          ))}
        </ul>
      )}

      <ProductFormExcelSections mode={mode} />
      <ProductWarehouseFields
        warehouses={warehouses}
        initialSelected={initialWarehouseIds}
        stockDriven
      />

      <Card>
        <CardHeader>
          <CardTitle>Képek</CardTitle>
          <CardDescription>
            Médiatárból választható feltöltött fájl vagy külső link — több kép is csatolható.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MediaSelector
            value={media}
            onChange={setMedia}
            multiple
            maxCount={5}
            description="Excel import bild URL-ek a médiatárban linkként is kezelhetők."
          />
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" loading={pending} disabled={pending}>
          {pending ? 'Mentés…' : 'Termék mentése'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Mégse
        </Button>
      </div>
    </form>
  );
}
