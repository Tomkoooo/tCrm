import Link from 'next/link';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@crm/lib';

export function DataTableSortHeader({
  label,
  sortKey,
  currentSort,
  basePath,
  queryString,
}: {
  label: string;
  sortKey: string;
  currentSort?: string;
  basePath: string;
  queryString: (overrides: Record<string, string | number | undefined>) => string;
}) {
  const isDesc = currentSort === `-${sortKey}`;
  const isAsc = currentSort === sortKey;

  const nextSort = isDesc ? sortKey : `-${sortKey}`;

  return (
    <Link
      href={`${basePath}?${queryString({ sort: nextSort, page: 1 })}`}
      className={cn(
        'inline-flex items-center gap-1 hover:underline',
        (isAsc || isDesc) && 'text-foreground'
      )}
    >
      {label}
      {isAsc && <ArrowUp className="h-3.5 w-3.5" />}
      {isDesc && <ArrowDown className="h-3.5 w-3.5" />}
    </Link>
  );
}
