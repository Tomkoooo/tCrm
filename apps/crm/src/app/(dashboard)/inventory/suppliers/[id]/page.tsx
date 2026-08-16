import { notFound } from 'next/navigation';
import { hasAnyPermission, requireAnyPermission } from '@crm/auth';
import { normalizeSupplierContacts } from '@crm/lib';
import { SUPPLIER_MANAGE_PERMISSION_KEYS, SUPPLIER_READ_PERMISSION_KEYS } from '@crm/inventory';
import { connectDB, Supplier } from '@crm/db-core';
import { Container } from '@crm/ui';
import { SupplierDetailView } from '../_components/supplier-detail-view';

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAnyPermission([...SUPPLIER_READ_PERMISSION_KEYS]);
  await connectDB();

  const { id } = await params;
  const supplier = await Supplier.findById(id).lean().exec();
  if (!supplier) notFound();

  const canManage = await hasAnyPermission([...SUPPLIER_MANAGE_PERMISSION_KEYS]);

  return (
    <Container className="flex max-w-3xl flex-col gap-4 md:gap-6">
      <SupplierDetailView
        canManage={canManage}
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
          contacts: normalizeSupplierContacts(supplier.contacts),
        }}
      />
    </Container>
  );
}
