'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ImageUpload({ onUploaded }: { onUploaded: (id: string) => void }) {
  const [pending, setPending] = useState(false);

  const upload = async (file: File) => {
    setPending(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      const res = await fetch('/api/uploads', { method: 'POST', body: fd });
      if (!res.ok) {
        toast.error('Upload failed');
        return;
      }
      const json = (await res.json()) as { id: string };
      onUploaded(json.id);
      toast.success('Uploaded');
    } catch (e) {
      toast.error('Upload failed');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="image">Upload image</Label>
      <div className="flex gap-2">
        <Input
          id="image"
          type="file"
          accept="image/*"
          disabled={pending}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
        <Button type="button" variant="outline" disabled>
          Add
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">Uploads are stored in GridFS.</p>
    </div>
  );
}
