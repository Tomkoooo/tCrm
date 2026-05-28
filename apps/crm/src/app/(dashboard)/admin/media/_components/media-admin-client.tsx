'use client';

import { MediaLibraryPanel } from '@/components/media/media-library-panel';

export function MediaAdminClient({
  canUpload,
  canDelete,
}: {
  canUpload: boolean;
  canDelete: boolean;
}) {
  return <MediaLibraryPanel active mode="admin" canUpload={canUpload} canDelete={canDelete} />;
}
