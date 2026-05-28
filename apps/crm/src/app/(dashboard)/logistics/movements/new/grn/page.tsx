import { requirePermission } from '@crm/auth';
import { connectDB, Warehouse } from '@crm/db';
import { Container } from '@crm/ui';
import { MovementForm } from '../../../_components/movement-form';

export default async function NewGrnPage() {
  await requirePermission('logistics:write');
  await connectDB();

  const warehouses = await Warehouse.find({ isActive: true }).sort({ name: 1 }).lean().exec();

  return (
    <Container className="max-w-2xl">
      <MovementForm
        type="grn"
        title="Új bevételezés (GRN)"
        warehouses={warehouses.map((w) => ({
          _id: String(w._id),
          key: w.key,
          name: w.name,
        }))}
      />
    </Container>
  );
}
