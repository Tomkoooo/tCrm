'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ColumnDef } from './types';

export function DataTableFilterBar<T>({ columns }: { columns: Array<ColumnDef<T>> }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filterable = useMemo(() => columns.filter((c) => c.filterable), [columns]);

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const next = new URLSearchParams(searchParams.toString());

    // reset paging on new filters
    next.set('page', '1');

    const search = String(fd.get('search') ?? '').trim();
    if (search) next.set('search', search);
    else next.delete('search');

    // clear existing f.*
    for (const key of Array.from(next.keys())) {
      if (key.startsWith('f.')) next.delete(key);
    }

    for (const col of filterable) {
      const raw = fd.get(`f.${col.key}`);
      if (raw === null) continue;
      const v = String(raw).trim();
      if (!v) continue;
      next.set(`f.${col.key}`, v);
    }

    router.push(`${pathname}?${next.toString()}`);
  };

  const clear = () => {
    router.push(pathname);
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <div className="flex flex-col gap-2 md:col-span-2">
          <label htmlFor="search" className="text-sm font-medium">
            Search
          </label>
          <input
            id="search"
            name="search"
            defaultValue={searchParams.get('search') ?? ''}
            placeholder="Search..."
            className="bg-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
          />
        </div>
        {filterable.slice(0, 3).map((col) => (
          <div key={col.key} className="flex flex-col gap-2">
            <label htmlFor={`f.${col.key}`} className="text-sm font-medium">
              {col.label}
            </label>
            <input
              id={`f.${col.key}`}
              name={`f.${col.key}`}
              defaultValue={searchParams.get(`f.${col.key}`) ?? ''}
              placeholder={col.type === 'boolean' ? 'true/false' : 'Filter...'}
              className="bg-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="bg-primary text-primary-foreground inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={clear}
          className="bg-background inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium"
        >
          Clear
        </button>
      </div>
    </form>
  );
}
