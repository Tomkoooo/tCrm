'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PlusIcon } from 'lucide-react';

import type { CategoryOption } from '@/lib/inventory/category-options';
import { Button, EntitySheet } from '@crm/ui';

import { QuickProductForm } from './quick-product-form';

export function QuickProductEntry({
  categories,
  warehouses,
  defaultWarehouseId,
  lockWarehouse = false,
  showCountLink = false,
}: {
  categories: CategoryOption[];
  warehouses: Array<{ id: string; name: string; key: string }>;
  defaultWarehouseId?: string;
  lockWarehouse?: boolean;
  showCountLink?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [formSession, setFormSession] = useState(0);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {showCountLink ? (
          <Button type="button" variant="outline" asChild>
            <Link href="/inventory/count">Leltár</Link>
          </Button>
        ) : null}
        <Button
          type="button"
          onClick={() => {
            setFormSession((n) => n + 1);
            setOpen(true);
          }}
        >
          <PlusIcon className="size-4" />
          Új termék
        </Button>
      </div>
      <EntitySheet
        open={open}
        onOpenChange={setOpen}
        title="Gyors termékfelvétel"
        description="Magyar név és kategória elég — a CRM SKU automatikusan készül. A többi adat később pótolható."
        size="md"
        mode="create"
      >
        <QuickProductForm
          key={formSession}
          categories={categories}
          warehouses={warehouses}
          defaultWarehouseId={defaultWarehouseId}
          lockWarehouse={lockWarehouse}
          onClose={() => setOpen(false)}
        />
      </EntitySheet>
    </>
  );
}
