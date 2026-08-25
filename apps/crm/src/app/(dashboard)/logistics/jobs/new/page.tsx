import { requirePermission } from '@crm/auth';
import { Container } from '@crm/ui';
import { JobCreateForm } from '../_components/job-create-form';

export default async function NewLogisticsJobPage() {
  await requirePermission('logistics:write');

  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold">Új szállítás</h1>
        <p className="text-muted-foreground text-sm">
          Alapadatok, tételek raktáronként, majd az átvételért és leadásért felelős dolgozó.
        </p>
      </div>
      <JobCreateForm />
    </Container>
  );
}
