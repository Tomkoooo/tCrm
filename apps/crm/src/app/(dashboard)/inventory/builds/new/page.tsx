import Link from 'next/link';
import { requirePermission } from '@crm/auth';
import { Container } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { getInventoryWarehouseScope } from '@/lib/inventory/warehouse-scope';
import { BuildForm } from '../_components/build-form';

export default async function NewBuildPage() {
  await requirePermission('inventory:write');
  const scope = await getInventoryWarehouseScope();

  return (
    <Container className="flex max-w-4xl flex-col gap-4 pb-12 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Új összeszerelés</h1>
          <p className="text-muted-foreground text-sm">
            Alkatrész termékekből új BOM — keresővel, képekkel és útmutatóval.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/inventory/builds">Vissza</Link>
        </Button>
      </div>
      <BuildForm
        warehouses={scope.warehouses}
        initialWarehouseIds={scope.warehouses.length === 1 ? [scope.warehouses[0]!.id] : []}
      />
    </Container>
  );
}
