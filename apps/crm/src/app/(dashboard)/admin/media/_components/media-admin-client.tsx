'use client';

import { MediaLibraryPanel } from '@crm/media/components';

export function MediaAdminClient({
  canUpload,
  canDelete,
}: {
  canUpload: boolean;
  canDelete: boolean;
}) {
  return <MediaLibraryPanel active mode="admin" canUpload={canUpload} canDelete={canDelete} />;
}
