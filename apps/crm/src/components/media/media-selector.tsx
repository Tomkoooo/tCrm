'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MEDIA_DELETE_PERMISSION_KEYS, MEDIA_UPLOAD_PERMISSION_KEYS } from '@crm/lib';
import { useAuth } from '@/hooks/use-auth';
import type { SelectedMedia } from '@/lib/media-types';
import { MediaManagerModal } from './media-manager-modal';
import { MediaThumbnail } from './media-thumbnail';

export function MediaSelector({
  label = 'Képek',
  description,
  value,
  onChange,
  multiple = true,
  maxCount = 5,
  name = 'imageId',
}: {
  label?: string;
  description?: string;
  value: SelectedMedia[];
  onChange: (items: SelectedMedia[]) => void;
  multiple?: boolean;
  maxCount?: number;
  /** Hidden input name for form submission */
  name?: string;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const canUpload = MEDIA_UPLOAD_PERMISSION_KEYS.some((k) => user?.permissions.includes(k));
  const canDelete = MEDIA_DELETE_PERMISSION_KEYS.some((k) => user?.permissions.includes(k));

  const move = (index: number, dir: -1 | 1) => {
    const next = [...value];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const remove = (id: string) => {
    onChange(value.filter((v) => v.id !== id));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Label>{label}</Label>
          {description && <p className="text-muted-foreground text-xs">{description}</p>}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          <ImagePlus className="mr-1 h-4 w-4" />
          Médiatár
        </Button>
      </div>

      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-3">
          {value.map((item, index) => (
            <li
              key={item.id}
              className="bg-muted/30 relative flex flex-col items-center gap-1 rounded-md border p-1"
            >
              <MediaThumbnail
                src={item.previewUrl}
                alt={item.filename}
                filename={item.filename}
                contentType={item.contentType}
                type={item.type}
                className="size-20 rounded"
              />
              <div className="flex gap-0.5">
                {multiple && index > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => move(index, -1)}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                )}
                {multiple && index < value.length - 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => move(index, 1)}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive h-6 w-6"
                  onClick={() => remove(item.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              {item.type === 'link' && (
                <span className="text-muted-foreground bg-background/90 absolute left-1 top-1 rounded px-1 text-[9px]">
                  URL
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">Nincs média csatolva.</p>
      )}

      {value.map((item) => (
        <input key={item.id} type="hidden" name={name} value={item.id} />
      ))}

      <MediaManagerModal
        open={open}
        onOpenChange={setOpen}
        canUpload={canUpload}
        canDelete={canDelete}
        multiple={multiple}
        maxCount={maxCount}
        selectedIds={value.map((v) => v.id)}
        onConfirm={(items) => {
          if (multiple) {
            const merged = new Map(value.map((v) => [v.id, v]));
            for (const item of items) merged.set(item.id, item);
            onChange([...merged.values()].slice(0, maxCount));
          } else {
            onChange(items.slice(0, 1));
          }
        }}
      />
    </div>
  );
}
