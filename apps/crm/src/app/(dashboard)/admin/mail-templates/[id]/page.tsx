import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePermission } from '@crm/auth';
import { Container } from '@crm/ui';
import { Button } from '@crm/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@crm/ui';
import { getMailTemplateForEdit } from '../actions';
import { MailTemplateForm } from '../_components/mail-template-form';

export default async function EditMailTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission('mail:manage');
  const { id } = await params;
  const template = await getMailTemplateForEdit(id);
  if (!template) return notFound();

  return (
    <Container className="flex max-w-3xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sablon szerkesztése</h1>
          <p className="text-muted-foreground font-mono text-sm">{template.key}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/mail-templates">Vissza</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{template.subject}</CardTitle>
        </CardHeader>
        <CardContent>
          <MailTemplateForm template={template} />
        </CardContent>
      </Card>
    </Container>
  );
}
