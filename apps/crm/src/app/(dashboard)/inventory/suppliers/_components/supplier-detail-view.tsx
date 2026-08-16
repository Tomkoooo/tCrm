'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { SupplierContactEntry } from '@crm/lib';
import { EntitySheet } from '@crm/ui';

import { EditSupplierForm } from './edit-supplier-form';
import { DeleteSupplierButton } from './delete-supplier-button';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@crm/ui';

export type SupplierDetailData = {
  _id: string;
  key: string;
  name: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  taxNo?: string;
  euTaxNo?: string;
  registry?: string;
  contacts: SupplierContactEntry[];
};

function Field({ label, value }: { label: string; value?: string }) {
  if (!value?.trim()) return null;
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

export function SupplierDetailView({
  supplier,
  canManage,
}: {
  supplier: SupplierDetailData;
  canManage: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{supplier.name}</h1>
          <p className="text-muted-foreground font-mono text-sm">{supplier.key}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/inventory/suppliers">Vissza a listához</Link>
          </Button>
          {canManage && (
            <Button type="button" size="sm" onClick={() => setEditOpen(true)}>
              Szerkesztés
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cégadatok</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="Cím" value={supplier.address} />
            <Field label="Város" value={supplier.city} />
            <Field label="Irányítószám" value={supplier.postalCode} />
            <Field label="Ország" value={supplier.country} />
            <Field label="Telefon" value={supplier.phone} />
            <Field label="E-mail" value={supplier.email} />
            <Field label="Adószám" value={supplier.taxNo} />
            <Field label="EU adószám" value={supplier.euTaxNo} />
            {supplier.registry ? (
              <div className="sm:col-span-2">
                <Field label="Cégjegyzék / egyéb" value={supplier.registry} />
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      {supplier.contacts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Kapcsolattartók</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {supplier.contacts.map((c, i) => (
                <li key={`${c.role}-${i}`} className="rounded-md border px-3 py-2 text-sm">
                  <p className="font-medium">{c.role}</p>
                  <div className="text-muted-foreground mt-1 flex flex-col gap-0.5">
                    {c.name && <span>{c.name}</span>}
                    {c.phone && <span>{c.phone}</span>}
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="text-primary hover:underline">
                        {c.email}
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {canManage && <DeleteSupplierButton id={supplier._id} name={supplier.name} />}

      {canManage && (
        <EntitySheet
          open={editOpen}
          onOpenChange={setEditOpen}
          title="Beszállító szerkesztése"
          description={supplier.name}
          size="lg"
          mode="edit"
        >
          <EditSupplierForm supplier={supplier} compact onSuccess={() => setEditOpen(false)} />
        </EntitySheet>
      )}
    </>
  );
}
