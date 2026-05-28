import { Suspense } from 'react';
import type { DataTableProps } from './types';
import { DataTableRoot } from './data-table-root';

function DataTableFallback() {
  return (
    <div className="text-muted-foreground flex h-32 items-center justify-center rounded-lg border text-sm">
      Táblázat betöltése…
    </div>
  );
}

export function DataTable<T extends Record<string, unknown>>(props: DataTableProps<T>) {
  return (
    <Suspense fallback={<DataTableFallback />}>
      <DataTableRoot {...props} />
    </Suspense>
  );
}
