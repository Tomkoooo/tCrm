'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MediaSelector } from '@/components/media/media-selector';
import type { SelectedMedia } from '@/lib/media-types';
import {
  createBuildAction,
  updateBuildAction,
  type BuildEditContext,
  type BuildFormState,
} from '../actions';
import { ComponentLinesEditor } from '../../_components/component-lines-editor';
import { ProductSkuLabel } from '@/components/product-sku-label';
import { OptionalEnDeFields } from '@/components/optional-en-de-fields';
import { productDisplayName } from '@crm/lib';
import { ProductWarehouseFields } from '../../_components/product-warehouse-fields';

function mediaFromIds(ids: string[]): SelectedMedia[] {
  return ids.map((id, index) => ({
    id,
    previewUrl: `/api/inventory/images/${id}`,
    filename: `Kép ${index + 1}`,
    type: 'file' as const,
  }));
}

export function BuildForm({
  mode = 'create',
  editContext,
  warehouses = [],
  initialWarehouseIds = [],
}: {
  mode?: 'create' | 'edit';
  editContext?: BuildEditContext;
  warehouses?: Array<{ id: string; name: string; key: string }>;
  initialWarehouseIds?: string[];
}) {
  const router = useRouter();
  const isEdit = mode === 'edit' && editContext;
  const action = isEdit ? updateBuildAction : createBuildAction;
  const [media, setMedia] = useState<SelectedMedia[]>(() =>
    isEdit ? mediaFromIds(editContext.imageIds) : []
  );
  const [state, formAction, pending] = useActionState(action, {
    success: false,
  } as BuildFormState);

  useEffect(() => {
    if (state.success && state.sku) {
      router.push(`/inventory/${state.sku}`);
      router.refresh();
    }
  }, [state, router]);

  const warehouseDefaults = isEdit ? editContext.warehouseIds : initialWarehouseIds;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {isEdit && <input type="hidden" name="sku" value={editContext.sku} />}

      {state.success === false && state.message && (
        <p className="text-destructive text-sm">{state.message}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Összeszerelés (BOM)</CardTitle>
          <CardDescription>
            {isEdit
              ? 'Alkatrészek, nevek, raktárak és útmutató módosítása.'
              : 'Új „kit” termék alkatrészekből — készlet és ajánlhatóság a komponensekből számolódik.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="sku">
              CRM SKU <span className="text-destructive">*</span>
            </Label>
            {isEdit ? (
              <ProductSkuLabel
                sku={editContext.sku}
                name={productDisplayName(editContext.names, editContext.sku)}
                layout="stack"
              />
            ) : (
              <Input id="sku" name="sku" required placeholder="pl. KIT-001" />
            )}
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="name_hu">Név (HU)</Label>
            <Input
              id="name_hu"
              name="name_hu"
              defaultValue={isEdit ? editContext.names.hu : undefined}
            />
            <OptionalEnDeFields>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name_en">Név (EN)</Label>
                  <Input
                    id="name_en"
                    name="name_en"
                    defaultValue={isEdit ? editContext.names.en : undefined}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name_de">Név (DE)</Label>
                  <Input
                    id="name_de"
                    name="name_de"
                    defaultValue={isEdit ? editContext.names.de : undefined}
                  />
                </div>
              </div>
            </OptionalEnDeFields>
          </div>
        </CardContent>
      </Card>

      <ProductWarehouseFields warehouses={warehouses} initialSelected={warehouseDefaults} />

      <Card>
        <CardHeader>
          <CardTitle>Alkatrészek</CardTitle>
        </CardHeader>
        <CardContent>
          <ComponentLinesEditor initial={isEdit ? editContext.components : []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Összeszerelési útmutató</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            id="assemblyGuide"
            name="assemblyGuide"
            rows={8}
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Lépések, megjegyzések, link a dokumentációhoz…"
            defaultValue={isEdit ? editContext.assemblyGuide : undefined}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Képek</CardTitle>
          <CardDescription>Médiatár — feltöltés vagy külső link</CardDescription>
        </CardHeader>
        <CardContent>
          <MediaSelector value={media} onChange={setMedia} multiple maxCount={5} />
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" loading={pending} disabled={pending}>
          {pending ? 'Mentés…' : isEdit ? 'Változtatások mentése' : 'Összeszerelés létrehozása'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Mégse
        </Button>
      </div>
    </form>
  );
}
