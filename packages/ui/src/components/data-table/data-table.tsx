import Link from 'next/link';
import { cn } from '@crm/lib';
import type { ColumnDef, DataTableProps } from './types';
import { DataTableFilterBar } from './filter-bar';
import { DataTablePagination } from './pagination';
import { DataTableSortHeader } from './sort-header';

function toQueryString(
  current: URLSearchParams,
  overrides: Record<string, string | number | undefined>
) {
  const next = new URLSearchParams(current.toString());
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined || v === '') next.delete(k);
    else next.set(k, String(v));
  }
  return next.toString();
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  query,
  total,
  basePath,
  rowHref,
  emptyMessage = 'No items',
}: DataTableProps<T>) {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;

  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.sort) params.set('sort', query.sort);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  for (const [k, v] of Object.entries(query.filters ?? {})) {
    const key = `f.${k}`;
    if (Array.isArray(v)) v.forEach((vv) => params.append(key, vv));
    else params.set(key, v);
  }

  const queryString = (overrides: Record<string, string | number | undefined>) =>
    toQueryString(params, overrides);

  const getValue = (row: T, col: ColumnDef<T>) => row[col.key];

  return (
    <div className="flex flex-col gap-4">
      <DataTableFilterBar columns={columns} />
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-3 py-2 text-left font-medium',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center'
                  )}
                >
                  {col.sortable ? (
                    <DataTableSortHeader
                      label={col.label}
                      sortKey={col.key}
                      currentSort={query.sort}
                      basePath={basePath}
                      queryString={queryString}
                    />
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => {
                const href = rowHref?.(row);
                return (
                  <tr
                    key={href ?? idx}
                    className={cn('border-b last:border-b-0', href && 'hover:bg-muted/40')}
                  >
                    {columns.map((col) => {
                      const value = getValue(row, col);
                      const content = col.render
                        ? col.render(value, row)
                        : value === null || value === undefined
                          ? ''
                          : String(value);
                      return (
                        <td
                          key={col.key}
                          className={cn(
                            'px-3 py-2',
                            col.align === 'right' && 'text-right',
                            col.align === 'center' && 'text-center'
                          )}
                        >
                          {href ? <Link href={href}>{content}</Link> : content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <DataTablePagination
        page={page}
        pageSize={pageSize}
        total={total}
        basePath={basePath}
        queryString={queryString}
      />
    </div>
  );
}
