'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { DownloadIcon, UploadIcon, WrenchIcon } from 'lucide-react';

import { ImportModal } from './import-modal';
import { BulkUpdateModal } from './bulk-update-modal';
import { ExportModal } from './export-modal';
import { WarehouseFilter } from './warehouse-filter';
import { Button, Checkbox, Label, Separator } from '@crm/ui';

export function InventoryTableToolbar({
  warehouses,
  warehouseId,
  canImport,
  canViewAllProducts = false,
  showAllProducts = false,
  canBulkUpdate = false,
  selectedSkus,
  filteredTotal,
}: {
  warehouses: Array<{ id: string; name: string; key: string }>;
  warehouseId?: string;
  canImport: boolean;
  canViewAllProducts?: boolean;
  showAllProducts?: boolean;
  canBulkUpdate?: boolean;
  selectedSkus: string[];
  filteredTotal: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [importOpen, setImportOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const setShowAllProducts = (checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (checked) params.set('showAll', 'true');
    else params.delete('showAll');
    params.delete('page');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const showWarehouse = warehouses.length > 1 || Boolean(warehouseId);
  const showScopeGroup = showWarehouse || canViewAllProducts;

  return (
    <>
      <WarehouseFilter warehouses={warehouses} selectedId={warehouseId} compact />

      {canViewAllProducts && (
        <label className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm">
          <Checkbox
            id="inventory-show-all"
            checked={showAllProducts}
            onCheckedChange={(checked) => setShowAllProducts(checked === true)}
          />
          <Label htmlFor="inventory-show-all" className="cursor-pointer font-normal">
            Inaktív is
          </Label>
        </label>
      )}

      {showScopeGroup && <Separator orientation="vertical" className="hidden h-6 lg:block" />}

      <div className="flex flex-wrap items-center gap-2">
        {canImport && (
          <Button type="button" variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <UploadIcon className="size-3.5" />
            Import
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" onClick={() => setExportOpen(true)}>
          <DownloadIcon className="size-3.5" />
          Export
          {selectedSkus.length > 0 ? ` (${selectedSkus.length})` : ''}
        </Button>
        {canBulkUpdate && (
          <Button type="button" variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
            <WrenchIcon className="size-3.5" />
            Tömeges
          </Button>
        )}
      </div>

      {canImport && <ImportModal open={importOpen} onOpenChange={setImportOpen} />}
      {canBulkUpdate && (
        <BulkUpdateModal open={bulkOpen} onOpenChange={setBulkOpen} warehouses={warehouses} />
      )}
      <ExportModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        selectedSkus={selectedSkus}
        filteredTotal={filteredTotal}
        canViewAllProducts={canViewAllProducts}
        showAllProducts={showAllProducts}
        warehouseId={warehouseId}
        warehouses={warehouses}
      />
    </>
  );
}
