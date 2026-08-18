'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ProductSkuLabel } from '@/components/product-sku-label';

import { formatProductSkuLine } from '@crm/lib';
import type { ProductTableRow } from '@/lib/inventory/product-table-columns';
import { deleteProductAction } from '../actions';
import { ProductEditPanel } from './product-edit-panel';
import { StockCountButton } from './stock-count-dialog';
import { Button } from '@crm/ui';

const SKU_HINT =
  'CRM SKU = kategória előtag + beszállítói cikkszám. SM import módban a product_id_SM a forrás.';

export function ProductSheetDetail({
  row,
  canWrite,
  canDelete,
}: {
  row: ProductTableRow;
  canWrite: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pendingDelete, startDelete] = useTransition();

  const title = row.name_hu ?? row.name_en ?? row.sku;

  if (editing && canWrite) {
    return (
      <ProductEditPanel
        row={row}
        onSuccess={() => {
          setEditing(false);
          router.refresh();
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 text-sm">
      {row.thumbnailUrl ? (
        <img
          src={row.thumbnailUrl}
          alt={title}
          className="h-32 w-32 rounded-md border object-cover"
        />
      ) : null}

      <dl className="grid grid-cols-2 gap-2">
        <dt className="text-muted-foreground">Termék</dt>
        <dd>
          <ProductSkuLabel sku={row.sku} name={title} layout="stack" />
        </dd>
        <dt className="text-muted-foreground">Beszállítói SKU</dt>
        <dd className="font-mono">{row.supplierSku ?? '—'}</dd>
        <dt className="text-muted-foreground">Márka</dt>
        <dd>{row.brand ?? '—'}</dd>
        <dt className="text-muted-foreground">EAN</dt>
        <dd className="font-mono">{row.ean ?? '—'}</dd>
        <dt className="text-muted-foreground">Raktár / készlet</dt>
        <dd>
          <StockCountButton
            sku={row.sku}
            name={title}
            summary={row.stockSummary}
            canWrite={canWrite}
          />
        </dd>
        <dt className="text-muted-foreground">Aktív</dt>
        <dd>{row.isActive ? 'Igen' : 'Nem'}</dd>
      </dl>

      {(row.name_en || row.name_de) && (
        <div>
          <p className="text-muted-foreground mb-1 text-xs">További nevek</p>
          {row.name_en && <p>EN: {row.name_en}</p>}
          {row.name_de && <p>DE: {row.name_de}</p>}
        </div>
      )}

      <p className="text-muted-foreground text-xs">{SKU_HINT}</p>

      <div className="flex flex-wrap gap-2 border-t pt-4">
        {canWrite && (
          <Button type="button" size="sm" onClick={() => setEditing(true)}>
            Szerkesztés
          </Button>
        )}

        <Button asChild type="button" size="sm" variant="outline">
          <Link href={`/inventory/${encodeURIComponent(row.sku)}`}>Részletes nézet</Link>
        </Button>
        {canDelete && row.isActive && (
          <Button
            type="button"
            size="sm"
            className="ml-auto"
            variant="destructive"
            loading={pendingDelete}
            disabled={pendingDelete}
            onClick={() => {
              if (!confirm(`Inaktiválja a terméket (${formatProductSkuLine(title, row.sku)})?`))
                return;
              startDelete(async () => {
                const fd = new FormData();
                fd.set('sku', row.sku);
                const result = await deleteProductAction({ success: false }, fd);
                if (result.success) {
                  toast.success(result.message ?? 'Termék inaktiválva.');
                  router.refresh();
                } else {
                  toast.error(result.message ?? 'Sikertelen inaktiválás.');
                }
              });
            }}
          >
            Inaktiválás
          </Button>
        )}
      </div>
    </div>
  );
}
