'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { DataTable } from '@crm/ui';
import type { ColumnDef, DataTableQuery } from '@crm/ui';
import { ProductSkuLabel } from '@/components/product-sku-label';
import { cn } from '@/lib/utils';

import { CountQtyCell } from './count-qty-cell';

export type CountTableRow = {
  productId: string;
  sku: string;
  name: string;
  name_hu?: string;
  onHand: number;
};

const selectClassName = cn(
  'border-input bg-background ring-offset-background flex h-9 min-w-[12rem] rounded-md border px-3 py-1 text-sm shadow-xs',
  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none'
);

export function CountTable({
  data,
  columns,
  query,
  total,
  warehouses,
  warehouseId,
  canWrite,
}: {
  data: CountTableRow[];
  columns: Array<ColumnDef<CountTableRow>>;
  query: DataTableQuery;
  total: number;
  warehouses: Array<{ id: string; name: string; key: string }>;
  warehouseId: string;
  canWrite: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tableColumns = useMemo(
    () =>
      columns.map((column) => {
        if (column.key === 'sku') {
          return {
            ...column,
            render: (_value: unknown, row: CountTableRow) => (
              <ProductSkuLabel
                sku={row.sku}
                name={row.name}
                layout="stack"
                href={`/inventory/${encodeURIComponent(row.sku)}`}
              />
            ),
          };
        }
        if (column.key === 'onHand') {
          return {
            ...column,
            render: (_value: unknown, row: CountTableRow) =>
              canWrite ? (
                <CountQtyCell
                  productId={row.productId}
                  warehouseId={warehouseId}
                  initialOnHand={row.onHand}
                />
              ) : (
                <span className="tabular-nums">{row.onHand}</span>
              ),
          };
        }
        return column;
      }),
    [columns, canWrite, warehouseId]
  );

  const onWarehouseChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('warehouseId', value);
    else params.delete('warehouseId');
    params.delete('page');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <DataTable<CountTableRow>
      mode="server"
      tableId="inventory-count"
      data={data}
      columns={tableColumns}
      query={query}
      total={total}
      basePath="/inventory/count"
      variant="compact"
      emptyMessage="Nincs termék a szűrők mellett."
      toolbarLeading={
        warehouses.length > 1 ? (
          <div className="flex items-center gap-2">
            <label htmlFor="count-warehouse" className="text-muted-foreground text-sm">
              Raktár
            </label>
            <select
              id="count-warehouse"
              className={selectClassName}
              value={warehouseId}
              onChange={(e) => onWarehouseChange(e.target.value)}
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        ) : undefined
      }
    />
  );
}
