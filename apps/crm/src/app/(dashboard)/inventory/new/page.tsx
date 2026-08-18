import { requirePermission } from '@crm/auth';
import { Container } from '@crm/ui';
import { getInventoryWarehouseScope } from '@/lib/inventory/warehouse-scope';
import { ProductForm } from '../_components/product-form';
import { createProductAction } from '../actions';

export default async function NewProductPage() {
  await requirePermission('inventory:write');
  const scope = await getInventoryWarehouseScope();

  return (
    <Container className="flex max-w-4xl flex-col gap-4 pb-12 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold">Új termék</h1>
        <p className="text-muted-foreground text-sm">
          Teljes Excel mezők. Gyors felvételhez a Termékek oldalon az <strong>Új termék</strong>{' '}
          gomb elég (magyar név + kategória).
        </p>
      </div>
      <ProductForm
        mode="create"
        action={createProductAction}
        warehouses={scope.warehouses}
        initialWarehouseIds={scope.warehouses.length === 1 ? [scope.warehouses[0]!.id] : []}
      />
    </Container>
  );
}
