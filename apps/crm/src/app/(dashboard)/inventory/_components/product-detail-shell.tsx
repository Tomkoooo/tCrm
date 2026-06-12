'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProductSkuLabel } from '@/components/product-sku-label';
import { Container } from '@crm/ui';
import { Button } from '@/components/ui/button';
import { productNameFromParts } from '@crm/lib';
import type { ProductTableRow } from '@/lib/inventory/product-table-columns';
import { ProductEditPanel } from './product-edit-panel';

export function ProductDetailShell({
  row,
  title,
  canWrite,
  hasBom,
  defaultEditing = false,
  children,
}: {
  row: ProductTableRow;
  title: string;
  canWrite: boolean;
  hasBom: boolean;
  defaultEditing?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editing, setEditing] = useState(defaultEditing);

  const exitEdit = useCallback(() => {
    setEditing(false);
    if (searchParams.get('edit')) {
      router.replace(`/inventory/${encodeURIComponent(row.sku)}`);
    }
  }, [router, row.sku, searchParams]);

  const enterEdit = useCallback(() => {
    setEditing(true);
    router.replace(`/inventory/${encodeURIComponent(row.sku)}?edit=1`);
  }, [router, row.sku]);

  const onSaveSuccess = useCallback(() => {
    exitEdit();
    router.refresh();
  }, [exitEdit, router]);

  if (editing && canWrite) {
    return (
      <Container className="flex max-w-6xl flex-col gap-4 pb-12 md:gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Termék szerkesztése</h1>
            <ProductSkuLabel sku={row.sku} name={productNameFromParts(row)} layout="stack" />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={exitEdit}>
              Megtekintés
            </Button>
            {hasBom && (
              <Button asChild variant="secondary" size="sm">
                <Link href="/inventory/builds">Összeszerelések</Link>
              </Button>
            )}
            <Button asChild variant="outline" size="sm">
              <Link href="/inventory">Vissza</Link>
            </Button>
          </div>
        </div>
        <ProductEditPanel row={row} onSuccess={onSaveSuccess} onCancel={exitEdit} />
      </Container>
    );
  }

  return (
    <Container className="flex max-w-6xl flex-col gap-4 pb-12 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <ProductSkuLabel
            sku={row.sku}
            name={title}
            layout="stack"
            className="[&>span:first-child]:text-2xl [&>span:first-child]:font-bold"
          />
        </div>
        <div className="flex gap-2">
          {canWrite && (
            <Button type="button" size="sm" onClick={enterEdit}>
              Szerkesztés
            </Button>
          )}
          {hasBom && (
            <Button asChild variant="secondary" size="sm">
              <Link href="/inventory/builds">Összeszerelések</Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href="/inventory">Vissza</Link>
          </Button>
        </div>
      </div>
      {children}
    </Container>
  );
}
