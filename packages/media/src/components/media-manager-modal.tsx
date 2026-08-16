'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@crm/ui';
import type { SelectedMedia } from '../paths';
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
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-lg sm:border">
        <DialogHeader className="shrink-0 border-b px-4 py-3 sm:px-6 sm:py-4">
          <DialogTitle>Médiatár</DialogTitle>
          <DialogDescription>
            {multiple
              ? `Válasszon képeket vagy PDF-et (max ${maxCount ?? '∞'}), töltsön fel több fájlt egyszerre, vagy adjon hozzá linket.`
              : 'Válasszon képet vagy PDF-et, töltsön fel, vagy adjon hozzá linket.'}
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
