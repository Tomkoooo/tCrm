'use client';

import { useEffect, useState } from 'react';
import type { ProductTableRow } from '@/lib/inventory/product-table-columns';
import { getProductEditContext, type ProductEditContext } from '../actions';
import { ProductEditForm } from './product-edit-form';

export function ProductEditPanel({
  row,
  onSuccess,
  onCancel,
}: {
  row: ProductTableRow;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
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

  return (
    <ProductEditForm
      row={row}
      editContext={editContext}
      onSuccess={() => {
        onSuccess?.();
      }}
      onCancel={onCancel}
    />
  );
}
