import { requirePermission } from '@crm/auth';
import { Container } from '@crm/ui';
import { getBrandingForAdmin } from './actions';
import { BrandingManager } from './_components/branding-manager';

export default async function BrandingPage() {
  await requirePermission('admin:access');
  const branding = await getBrandingForAdmin();

  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold">Arculat</h1>
        <p className="text-muted-foreground text-sm">
          Testreszabhatja az alkalmazás nevét, logóját, faviconját és a bejelentkezési oldal
          megjelenését. A változtatások azonnal érvénybe lépnek minden felhasználónál.
        </p>
      </div>
      <BrandingManager initial={branding} />
    </Container>
  );
}
