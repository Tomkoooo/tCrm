'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { EntitySheet } from '@crm/ui';
import { Button } from '@/components/ui/button';
import type { ProductTableRow } from '@/lib/inventory/product-table-columns';
import { deleteProductAction, getProductEditContext, type ProductEditContext } from '../actions';
import { ProductEditForm } from './product-edit-form';

const SKU_HINT =
  'CRM SKU = kategória előtag + beszállítói cikkszám. SM import módban a product_id_SM a forrás.';

function EditSheetBody({ row, onSuccess }: { row: ProductTableRow; onSuccess: () => void }) {
  const [editContext, setEditContext] = useState<ProductEditContext | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEditContext(null);
    setLoadError(null);

    getProductEditContext(row.sku).then((ctx) => {
      if (cancelled) return;
      if (!ctx) {
        setLoadError('A termék szerkesztési adatai nem tölthetők be.');
        return;
      }
      setEditContext(ctx);
    });

    return () => {
      cancelled = true;
    };
  }, [row.sku]);

  if (loadError) {
    return <p className="text-destructive text-sm">{loadError}</p>;
  }

  if (!editContext) {
    return <p className="text-muted-foreground text-sm">Betöltés…</p>;
  }

  return <ProductEditForm row={row} editContext={editContext} onSuccess={onSuccess} />;
}

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
  const [editOpen, setEditOpen] = useState(false);
  const [pendingDelete, startDelete] = useTransition();

  const title = row.name_hu ?? row.name_en ?? row.sku;

  return (
    <>
      <div className="flex flex-col gap-4 text-sm">
        {row.thumbnailUrl ? (
          <img
            src={row.thumbnailUrl}
            alt={title}
            className="h-32 w-32 rounded-md border object-cover"
          />
        ) : null}

        <dl className="grid grid-cols-2 gap-2">
          <dt className="text-muted-foreground">CRM SKU</dt>
          <dd className="font-mono">{row.sku}</dd>
          <dt className="text-muted-foreground">Beszállítói SKU</dt>
          <dd className="font-mono">{row.supplierSku ?? '—'}</dd>
          <dt className="text-muted-foreground">Márka</dt>
          <dd>{row.brand ?? '—'}</dd>
          <dt className="text-muted-foreground">EAN</dt>
          <dd className="font-mono">{row.ean ?? '—'}</dd>
          <dt className="text-muted-foreground">Raktár / készlet</dt>
          <dd>{row.stockSummary ?? '—'}</dd>
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
            <Button type="button" size="sm" onClick={() => setEditOpen(true)}>
              Szerkesztés
            </Button>
          )}

          <Button asChild type="button" size="sm" variant="outline">
            <Link href={`/inventory/${row.sku}`}>BOM és készletnapló</Link>
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
                if (!confirm(`Inaktiválja a terméket (${row.sku})?`)) return;
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

      {canWrite && (
        <EntitySheet
          open={editOpen}
          onOpenChange={setEditOpen}
          title="Termék szerkesztése"
          description={title}
          size="xl"
          mode="edit"
        >
          {editOpen ? <EditSheetBody row={row} onSuccess={() => setEditOpen(false)} /> : null}
        </EntitySheet>
      )}
    </>
  );
}
