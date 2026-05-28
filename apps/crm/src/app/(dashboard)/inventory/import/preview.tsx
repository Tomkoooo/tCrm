'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { UploadForm } from './upload-form';
import { commitAction, type ImportState } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ImportClient() {
  const [preview, setPreview] = useState<Extract<ImportState, { success: true }> | null>(null);
  const [pending, setPending] = useState(false);

  const commit = async () => {
    if (!preview?.parsed || !preview.supplierKey || !preview.categorySlug) return;
    setPending(true);
    try {
      const fd = new FormData();
      fd.set('parsed', preview.parsed);
      fd.set('supplierKey', preview.supplierKey);
      fd.set('categorySlug', preview.categorySlug);
      const result = await commitAction({ success: false, message: '' }, fd);
      if (result.success) {
        toast.success(result.message);
        setPreview(null);
      } else {
        toast.error(result.message);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <UploadForm onPreviewReady={(s) => setPreview(s)} />

      {preview?.preview && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              Rows: {preview.preview.rows} · Errors: {preview.preview.errors} · Warnings:{' '}
              {preview.preview.warnings}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button onClick={commit} disabled={pending || preview.preview.errors > 0}>
              {pending ? 'Committing...' : 'Commit import'}
            </Button>
            {preview.preview.errors > 0 && (
              <p className="text-destructive text-sm">Fix errors before committing.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
