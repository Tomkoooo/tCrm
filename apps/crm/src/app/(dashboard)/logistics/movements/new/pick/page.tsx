import { requirePermission } from '@crm/auth';
import { connectDB, Product, Warehouse } from '@crm/db';
import { Container } from '@crm/ui';
import { MovementForm } from '../../../_components/movement-form';

export default async function NewPickPage() {
  await requirePermission('logistics:write');
  await connectDB();

  const [warehouses, products] = await Promise.all([
    Warehouse.find({ isActive: true }).sort({ name: 1 }).lean().exec(),
    Product.find({ isActive: true }).sort({ sku: 1 }).limit(200).lean().exec(),
  ]);

  return (
    <Container className="max-w-2xl">
      <MovementForm
        type="pick"
        title="New pick list"
        warehouses={warehouses.map((w) => ({
          _id: String(w._id),
          key: w.key,
          name: w.name,
        }))}
        products={products.map((p) => ({
          _id: String(p._id),
          sku: p.sku,
          name: p.names.en ?? p.names.de ?? p.sku,
        }))}
      />
    </Container>
  );
}
