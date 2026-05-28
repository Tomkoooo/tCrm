'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { uploadAction, type ImportState } from './actions';

const initialState: ImportState = { success: false, message: '' };

export function UploadForm({
  onPreviewReady,
}: {
  onPreviewReady: (state: Extract<ImportState, { success: true }>) => void;
}) {
  const [state, formAction, pending] = useActionState(uploadAction, initialState);

  if (state.success && state.preview && state.parsed) {
    onPreviewReady(state);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Excel</CardTitle>
        <CardDescription>Upload `Alutent.xlsx` format (Munka1 sheet).</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <Input name="supplierKey" placeholder="Supplier key (e.g. steinigke)" required />
          <Input name="categorySlug" placeholder="Target category slug (e.g. technika)" required />
          <Input type="file" name="file" accept=".xlsx,.xls" required />
          <Button type="submit" disabled={pending}>
            {pending ? 'Parsing...' : 'Preview'}
          </Button>
          {!state.success && state.message && (
            <p className="text-destructive text-sm">{state.message}</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
