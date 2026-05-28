'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { InventoryFormState } from '../actions';
import { ImageUpload } from './image-upload';

export function ProductForm({
  mode,
  action,
  initialSku,
}: {
  mode: 'create' | 'edit';
  action: (prev: InventoryFormState, formData: FormData) => Promise<InventoryFormState>;
  initialSku?: string;
}) {
  const router = useRouter();
  const [uploadedImageIds, setUploadedImageIds] = useState<string[]>([]);
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
      <Card>
        <CardHeader>
          <CardTitle>{mode === 'create' ? 'Create product' : 'Edit product'}</CardTitle>
          <CardDescription>Basic fields (Phase 1). Import fills the full schema.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="sku">
              SKU <span className="text-sm text-red-600">*</span>
            </Label>
            <Input
              id="sku"
              name="sku"
              defaultValue={initialSku ?? ''}
              disabled={mode === 'edit'}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="brand">Brand</Label>
            <Input id="brand" name="brand" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name_en">
              Name (EN) <span className="text-sm text-red-600">*</span>
            </Label>
            <Input id="name_en" name="name_en" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name_hu">Name (HU)</Label>
            <Input id="name_hu" name="name_hu" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
          <CardDescription>Uploads to GridFS. Stored on the product in Phase 1+.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ImageUpload
            onUploaded={(id) => {
              setUploadedImageIds((prev) => [...prev, id]);
            }}
          />
          {uploadedImageIds.length > 0 && (
            <div className="text-muted-foreground text-sm">
              Uploaded: {uploadedImageIds.join(', ')}
            </div>
          )}
          {uploadedImageIds.map((id) => (
            <input key={id} type="hidden" name="imageId" value={id} />
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving...' : 'Save'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
