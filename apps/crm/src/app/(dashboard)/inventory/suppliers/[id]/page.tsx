import Link from 'next/link';
import { notFound } from 'next/navigation';
import { hasPermission, requirePermission } from '@crm/auth';
import { connectDB, Supplier } from '@crm/db';
import { Container } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EditSupplierForm } from '../_components/edit-supplier-form';
import { DeleteSupplierButton } from '../_components/delete-supplier-button';

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('suppliers:read');
  await connectDB();

  const { id } = await params;
  const supplier = await Supplier.findById(id).lean().exec();
  if (!supplier) notFound();

  const canManage = await hasPermission('suppliers:manage');

  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{supplier.name}</h1>
          <p className="text-muted-foreground font-mono text-sm">{supplier.key}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/inventory/suppliers">Vissza a listához</Link>
        </Button>
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Szerkesztés</CardTitle>
          </CardHeader>
          <CardContent>
            <EditSupplierForm
              supplier={{
                _id: String(supplier._id),
                key: supplier.key,
                name: supplier.name,
                address: supplier.address,
                city: supplier.city,
                postalCode: supplier.postalCode,
                country: supplier.country,
                phone: supplier.phone,
                email: supplier.email,
                taxNo: supplier.taxNo,
                euTaxNo: supplier.euTaxNo,
                registry: supplier.registry,
                contacts: supplier.contacts as Record<string, string | undefined>,
              }}
            />
          </CardContent>
        </Card>
      )}

      {canManage && <DeleteSupplierButton id={id} name={supplier.name} />}
    </Container>
  );
}
