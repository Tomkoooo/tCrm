import { requirePermission } from '@crm/auth';
import { Container } from '@crm/ui';
import { loadJobFormOptionsAction } from '../actions';
import { JobCreateForm } from '../_components/job-create-form';

export default async function NewLogisticsJobPage() {
  await requirePermission('logistics:write');
  const options = await loadJobFormOptionsAction();

  return (
    <Container className="flex max-w-3xl flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold">Új szállítás</h1>
        <p className="text-muted-foreground text-sm">
          Eseményhez tartozó alkatrészek és összeszerelések kiszállítása.
        </p>
      </div>
      <JobCreateForm warehouses={options.warehouses} vehicles={options.vehicles} />
    </Container>
  );
}
