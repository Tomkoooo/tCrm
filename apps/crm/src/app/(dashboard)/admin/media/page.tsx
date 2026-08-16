import { hasAnyPermission, requireAnyPermission } from '@crm/auth';
import {
  MEDIA_DELETE_PERMISSION_KEYS,
  MEDIA_READ_PERMISSION_KEYS,
  MEDIA_UPLOAD_PERMISSION_KEYS,
} from '@crm/media';
import { Container } from '@crm/ui';
import { MediaAdminClient } from './_components/media-admin-client';

export default async function AdminMediaPage() {
  await requireAnyPermission([...MEDIA_READ_PERMISSION_KEYS]);

  const [canUpload, canDelete] = await Promise.all([
    hasAnyPermission([...MEDIA_UPLOAD_PERMISSION_KEYS]),
    hasAnyPermission([...MEDIA_DELETE_PERMISSION_KEYS]),
  ]);

  return (
    <Container className="flex max-w-6xl flex-col gap-3 md:gap-4">
      <div>
        <h1 className="text-2xl font-bold">Médiatár</h1>
        <p className="text-muted-foreground text-sm">
          Központi képtár — feltöltés, külső linkek, keresés és törlés. Hash alapú deduplikáció
          fájloknál.
        </p>
      </div>

      <div className="border-border flex min-h-[min(70vh,720px)] flex-col overflow-hidden rounded-lg border">
        <MediaAdminClient canUpload={canUpload} canDelete={canDelete} />
      </div>
    </Container>
  );
}
