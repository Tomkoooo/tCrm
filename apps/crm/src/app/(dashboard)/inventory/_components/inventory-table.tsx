'use client';

import type React from 'react';
import Link from 'next/link';
import { DataTable } from '@crm/ui';
import type { ColumnDef, DataTableQuery } from '@crm/ui';
import type { ProductTableRow } from '@/lib/inventory/product-table-columns';

export type InventoryTableRow = ProductTableRow;

const SKU_HINT =
  'CRM SKU = kategória előtag + beszállítói cikkszám (importkor automatikusan generálódik a product_id és crm_category_slug alapján).';

export function InventoryTable({
  data,
  columns,
  query,
  total,
  toolbarExtra,
}: {
  data: InventoryTableRow[];
  columns: Array<ColumnDef<InventoryTableRow>>;
  query: DataTableQuery;
  total: number;
  toolbarExtra?: React.ReactNode;
}) {
  return (
    <DataTable<InventoryTableRow>
      mode="server"
      tableId="inventory-products"
      data={data}
      columns={columns}
      query={query}
      total={total}
      basePath="/inventory"
      rowHref={(r) => `/inventory/${r.sku}`}
      rowOpen="sheet"
      toolbarExtra={toolbarExtra}
      emptyMessage="Nincs termék."
      rowDetail={{
        title: (r) => r.sku,
        description: (r) => r.name_hu ?? r.name_en ?? '',
        render: (r) => (
          <div className="flex flex-col gap-4 text-sm">
            {r.thumbnailUrl ? (
              <img
                src={r.thumbnailUrl}
                alt={r.name_hu ?? r.sku}
                className="h-32 w-32 rounded-md border object-cover"
              />
            ) : null}
            <dl className="grid grid-cols-2 gap-2">
              <dt className="text-muted-foreground">CRM SKU</dt>
              <dd className="font-mono">{r.sku}</dd>
              <dt className="text-muted-foreground">Beszállítói SKU</dt>
              <dd className="font-mono">{r.supplierSku ?? '—'}</dd>
              <dt className="text-muted-foreground">Márka</dt>
              <dd>{r.brand ?? '—'}</dd>
              <dt className="text-muted-foreground">Aktív</dt>
              <dd>{r.isActive ? 'Igen' : 'Nem'}</dd>
            </dl>
            <p className="text-muted-foreground text-xs">{SKU_HINT}</p>
            <Link href={`/inventory/${r.sku}`} className="text-primary font-medium underline">
              Teljes termékoldal →
            </Link>
          </div>
        ),
      }}
    />
  );
}
