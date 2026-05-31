'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@crm/ui';
import type { ColumnDef, DataTableQuery } from '@crm/ui';
import { Checkbox } from '@/components/ui/checkbox';
import type { ProductTableRow } from '@/lib/inventory/product-table-columns';
import { toggleProductActiveAction } from '../actions';
import { InventoryTableToolbar } from './inventory-toolbar';
import { ProductSheetDetail } from './product-sheet-detail';

export type InventoryTableRow = ProductTableRow;

function ActiveStatusCell({ row, canEdit }: { row: InventoryTableRow; canEdit: boolean }) {
  const [checked, setChecked] = useState(row.isActive);
  const [pending, startTransition] = useTransition();

  if (!canEdit) {
    return <span>{checked ? 'Igen' : 'Nem'}</span>;
  }

  return (
    <div
      className="flex justify-center"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Checkbox
        checked={checked}
        disabled={pending}
        aria-label={checked ? 'Aktív termék' : 'Inaktív termék'}
        onCheckedChange={(value) => {
          const next = value === true;
          setChecked(next);
          startTransition(async () => {
            const result = await toggleProductActiveAction(row.sku, next);
            if (!result.success) {
              setChecked(!next);
              toast.error(result.message);
              return;
            }
            toast.success(result.message);
          });
        }}
      />
    </div>
  );
}

export function InventoryTable({
  data,
  columns,
  query,
  total,
  canEditActive = false,
  canWrite = false,
  canDelete = false,
  warehouses,
  warehouseId,
  canImport,
  canViewAllProducts,
  showAllProducts,
  canBulkUpdate,
}: {
  data: InventoryTableRow[];
  columns: Array<ColumnDef<InventoryTableRow>>;
  query: DataTableQuery;
  total: number;
  canEditActive?: boolean;
  canWrite?: boolean;
  canDelete?: boolean;
  warehouses: Array<{ id: string; name: string; key: string }>;
  warehouseId?: string;
  canImport: boolean;
  canViewAllProducts?: boolean;
  showAllProducts?: boolean;
  canBulkUpdate?: boolean;
}) {
  const [selectedSkus, setSelectedSkus] = useState<string[]>([]);

  const tableColumns = useMemo(
    () =>
      columns.map((column) =>
        column.key === 'isActive'
          ? {
              ...column,
              sortable: false,
              filterable: false,
              render: (_value: unknown, row: InventoryTableRow) => (
                <ActiveStatusCell row={row} canEdit={canEditActive} />
              ),
            }
          : column
      ),
    [columns, canEditActive]
  );

  return (
    <DataTable<InventoryTableRow>
      mode="server"
      tableId="inventory-products"
      data={data}
      columns={tableColumns}
      query={query}
      total={total}
      basePath="/inventory"
      selectable
      getRowKey={(r) => r.sku}
      selectedRowKeys={selectedSkus}
      onSelectedRowKeysChange={setSelectedSkus}
      rowOpen="sheet"
      toolbarLeading={
        <InventoryTableToolbar
          warehouses={warehouses}
          warehouseId={warehouseId}
          canImport={canImport}
          canViewAllProducts={canViewAllProducts}
          showAllProducts={showAllProducts}
          canBulkUpdate={canBulkUpdate}
          selectedSkus={selectedSkus}
          filteredTotal={total}
        />
      }
      emptyMessage={
        canImport
          ? 'Nincs termék. Importáljon Excelből (Import gomb), vagy hozzon létre újat.'
          : 'Nincs termék a jelenlegi szűrők mellett.'
      }
      rowDetail={{
        title: (r) => r.name_hu ?? r.name_en ?? r.sku,
        description: (r) => r.sku,
        render: (r) => <ProductSheetDetail row={r} canWrite={canWrite} canDelete={canDelete} />,
      }}
    />
  );
}
