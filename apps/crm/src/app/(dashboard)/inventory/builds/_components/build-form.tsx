'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MediaSelector } from '@/components/media/media-selector';
import type { SelectedMedia } from '@/lib/media-types';
import { createBuildAction, type BuildFormState } from '../actions';
import { ComponentLinesEditor } from '../../_components/component-lines-editor';
import { OptionalEnDeFields } from '@/components/optional-en-de-fields';

export function BuildForm() {
  const router = useRouter();
  const [media, setMedia] = useState<SelectedMedia[]>([]);
  const [state, action, pending] = useActionState(createBuildAction, {
    success: false,
  } as BuildFormState);

  useEffect(() => {
    if (state.success && state.sku) {
      router.push(`/inventory/${state.sku}`);
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={action} className="flex flex-col gap-6">
      {state.success === false && state.message && (
        <p className="text-destructive text-sm">{state.message}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Összeszerelés (BOM)</CardTitle>
          <CardDescription>
            Új „kit” termék alkatrészekből — készlet és ajánlhatóság a komponensekből számolódik.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="sku">
              CRM SKU <span className="text-destructive">*</span>
            </Label>
            <Input id="sku" name="sku" required placeholder="pl. KIT-001" />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="name_hu">Név (HU)</Label>
            <Input id="name_hu" name="name_hu" />
            <OptionalEnDeFields>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name_en">Név (EN)</Label>
                  <Input id="name_en" name="name_en" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name_de">Név (DE)</Label>
                  <Input id="name_de" name="name_de" />
                </div>
              </div>
            </OptionalEnDeFields>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alkatrészek</CardTitle>
        </CardHeader>
        <CardContent>
          <ComponentLinesEditor />
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
        <Button type="submit" disabled={pending}>
          {pending ? 'Mentés…' : 'Összeszerelés létrehozása'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Mégse
        </Button>
      </div>
    </form>
  );
}
