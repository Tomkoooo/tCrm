'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ImportModal } from './import-modal';

export function InventoryToolbar({ canImport }: { canImport: boolean }) {
  const [importOpen, setImportOpen] = useState(false);

  return (
    <div className="flex gap-2">
      {canImport && (
        <>
          <Button type="button" variant="outline" onClick={() => setImportOpen(true)}>
            Importálás
          </Button>
          <ImportModal open={importOpen} onOpenChange={setImportOpen} />
        </>
      )}
      <Button asChild variant="outline">
        <Link href="/inventory/export">Export Excel</Link>
      </Button>
      <Button asChild>
        <Link href="/inventory/new">Új termék</Link>
      </Button>
    </div>
  );
}
