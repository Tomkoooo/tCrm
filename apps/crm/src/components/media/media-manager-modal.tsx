'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { SelectedMedia } from '@/lib/media-types';
import { MediaLibraryPanel } from './media-library-panel';

export function MediaManagerModal({
  open,
  onOpenChange,
  multiple,
  maxCount,
  selectedIds,
  onConfirm,
  canUpload,
  canDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  multiple: boolean;
  maxCount?: number;
  selectedIds: string[];
  onConfirm: (items: SelectedMedia[]) => void;
  canUpload: boolean;
  canDelete: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Médiatár</DialogTitle>
          <DialogDescription>
            {multiple
              ? `Válasszon képeket (max ${maxCount ?? '∞'}) vagy töltsön fel újat.`
              : 'Válasszon egy képet, töltsön fel, vagy adjon hozzá linket.'}
          </DialogDescription>
        </DialogHeader>

        <MediaLibraryPanel
          active={open}
          mode="picker"
          canUpload={canUpload}
          canDelete={canDelete}
          multiple={multiple}
          maxCount={maxCount}
          selectedIds={selectedIds}
          onConfirm={(items) => {
            onConfirm(items);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
