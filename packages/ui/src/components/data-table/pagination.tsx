import Link from 'next/link';

export function DataTablePagination({
  page,
  pageSize,
  total,
  basePath,
  queryString,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  queryString: (overrides: Record<string, string | number | undefined>) => string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-muted-foreground text-sm">
        Page {page} of {totalPages} · {total} items
      </p>
      <div className="flex gap-2">
        {prevDisabled ? (
          <button
            type="button"
            disabled
            className="bg-background inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm opacity-50"
          >
            Previous
          </button>
        ) : (
          <Link
            className="bg-background inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm"
            href={`${basePath}?${queryString({ page: page - 1 })}`}
          >
            Previous
          </Link>
        )}

        {nextDisabled ? (
          <button
            type="button"
            disabled
            className="bg-background inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm opacity-50"
          >
            Next
          </button>
        ) : (
          <Link
            className="bg-background inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm"
            href={`${basePath}?${queryString({ page: page + 1 })}`}
          >
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
