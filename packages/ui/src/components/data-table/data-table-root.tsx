'use client';

import type React from 'react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowDownUpIcon, Columns3Icon, ExternalLinkIcon, FilterIcon, XIcon } from 'lucide-react';
import { DataTableHeaderHint } from './header-hint';
import {
  columnPickerLabel,
  getFactoryDefaultVisibleColumns,
  getHideableColumns,
} from './preferences';
import { cn } from '@crm/lib';
import { EntitySheet } from '../entity-sheet';
import { parseDataTableQuery } from './query';
import type { ColumnDef, DataTableProps, DataTableQuery } from './types';
import { getDefaultVisibleColumns, getTablePreferences, setTablePreferences } from './preferences';
import { applyClientQuery } from './client-query';
import { DataTableImageCell } from './image-cell';
import { DataTablePagination } from './pagination';
import { DataTableSortHeader } from './sort-header';

type Panel = 'filters' | 'sort' | 'columns' | 'detail' | null;

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

function buildParamsFromQuery(query: DataTableQuery) {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.sort) params.set('sort', query.sort);
  params.set('page', String(query.page ?? 1));
  params.set('pageSize', String(query.pageSize ?? 10));
  for (const [k, v] of Object.entries(query.filters ?? {})) {
    const key = `f.${k}`;
    if (Array.isArray(v)) v.forEach((vv) => params.append(key, vv));
    else params.set(key, v);
  }
  return params;
}

export function DataTableRoot<T extends Record<string, unknown>>({
  mode = 'server',
  data,
  columns,
  query,
  total: serverTotal,
  basePath,
  tableId,
  toolbarLeading,
  toolbarExtra,
  selectable = false,
  getRowKey,
  selectedRowKeys: selectedRowKeysProp,
  onSelectedRowKeysChange,
  rowHref,
  rowDetail,
  rowOpen = 'navigate',
  emptyMessage = 'Nincs találat',
  variant = 'default',
}: DataTableProps<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlQuery = parseDataTableQuery(searchParams);
  const effectiveQuery: DataTableQuery =
    mode === 'client'
      ? {
          page: 1,
          pageSize: 25,
          ...query,
          ...urlQuery,
        }
      : query;

  const [panel, setPanel] = useState<Panel>(null);
  const [detailRow, setDetailRow] = useState<T | null>(null);
  const [internalSelectedKeys, setInternalSelectedKeys] = useState<string[]>([]);
  const selectedRowKeys = selectedRowKeysProp ?? internalSelectedKeys;
  const setSelectedRowKeys = onSelectedRowKeysChange ?? setInternalSelectedKeys;

  const resolveRowKey = useCallback(
    (row: T, index: number) => {
      if (getRowKey) return getRowKey(row);
      const id = (row as Record<string, unknown>)['_id'];
      if (id != null) return String(id);
      const sku = (row as Record<string, unknown>)['sku'];
      if (sku != null) return String(sku);
      return String(index);
    },
    [getRowKey]
  );
  const columnKeySignature = columns.map((c) => c.key).join('\0');

  const [visibleKeys, setVisibleKeys] = useState<string[]>(() =>
    getDefaultVisibleColumns(tableId, columns)
  );

  useEffect(() => {
    setVisibleKeys(getDefaultVisibleColumns(tableId, columns));
  }, [tableId, columnKeySignature, columns]);

  useEffect(() => {
    const prefs = getTablePreferences(tableId);
    if (!searchParams.has('pageSize') && prefs.pageSize) {
      const next = new URLSearchParams(searchParams.toString());
      next.set('pageSize', String(prefs.pageSize));
      router.replace(`${pathname}?${next.toString()}`);
    }
  }, [tableId, pathname, router, searchParams]);

  const displayColumns = useMemo(
    () => columns.filter((c) => visibleKeys.includes(c.key)),
    [columns, visibleKeys]
  );

  const clientResult = useMemo(() => {
    if (mode !== 'client') return null;
    return applyClientQuery(data, effectiveQuery, columns);
  }, [mode, data, effectiveQuery, columns]);

  const rows = mode === 'client' ? (clientResult?.rows ?? []) : data;
  const total = mode === 'client' ? (clientResult?.total ?? 0) : serverTotal;

  const params = buildParamsFromQuery(effectiveQuery);
  const queryString = (overrides: Record<string, string | number | undefined>) =>
    toQueryString(params, overrides);

  const pushQuery = useCallback(
    (overrides: Record<string, string | number | undefined>) => {
      const qs = queryString({ ...overrides, page: 1 });
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, queryString, router]
  );

  const clearAll = () => {
    router.push(pathname);
    setPanel(null);
  };

  const getValue = (row: T, col: ColumnDef<T>) => (row as Record<string, unknown>)[col.key];

  const renderCell = (row: T, col: ColumnDef<T>) => {
    const value = getValue(row, col);
    if (col.render) return col.render(value, row);
    if (col.type === 'image') {
      const src = value ? String(value) : undefined;
      const alt =
        col.imageOptions?.alt?.(row) ??
        (col.imageOptions?.altKey
          ? String((row as Record<string, unknown>)[col.imageOptions.altKey] ?? '')
          : '');
      return <DataTableImageCell src={src} alt={alt} size={col.imageOptions?.size} />;
    }
    if (value === null || value === undefined) return '';
    if (col.type === 'boolean') return value ? 'Igen' : 'Nem';
    return String(value);
  };

  const handleRowClick = (row: T) => {
    if ((rowOpen === 'sheet' || rowOpen === 'both') && rowDetail) {
      setDetailRow(row);
      setPanel('detail');
    }
  };

  const filterable = columns.filter((c) => c.filterable);
  const sortable = columns.filter((c) => c.sortable);

  const pageRowKeys = useMemo(
    () => rows.map((row, idx) => resolveRowKey(row, idx)),
    [rows, resolveRowKey]
  );
  const allPageSelected =
    selectable && pageRowKeys.length > 0 && pageRowKeys.every((k) => selectedRowKeys.includes(k));
  const somePageSelected =
    selectable && pageRowKeys.some((k) => selectedRowKeys.includes(k)) && !allPageSelected;

  const togglePageSelection = () => {
    if (allPageSelected) {
      setSelectedRowKeys(selectedRowKeys.filter((k) => !pageRowKeys.includes(k)));
    } else {
      setSelectedRowKeys([...new Set([...selectedRowKeys, ...pageRowKeys])]);
    }
  };

  const toggleRowSelection = (key: string) => {
    if (selectedRowKeys.includes(key)) {
      setSelectedRowKeys(selectedRowKeys.filter((k) => k !== key));
    } else {
      setSelectedRowKeys([...selectedRowKeys, key]);
    }
  };

  const selectionColSpan = (selectable ? 1 : 0) + (rowOpen === 'both' && rowHref ? 1 : 0);

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; clear: () => void }> = [];
    if (effectiveQuery.search) {
      chips.push({
        key: 'search',
        label: `Keresés: ${effectiveQuery.search}`,
        clear: () => pushQuery({ search: undefined }),
      });
    }
    for (const [k, v] of Object.entries(effectiveQuery.filters ?? {})) {
      const col = columns.find((c) => c.key === k);
      const val = Array.isArray(v) ? v.join('–') : v;
      chips.push({
        key: k,
        label: `${col?.label ?? k}: ${val}`,
        clear: () => {
          const next = new URLSearchParams(searchParams.toString());
          next.delete(`f.${k}`);
          next.set('page', '1');
          router.push(`${pathname}?${next.toString()}`);
        },
      });
    }
    if (effectiveQuery.sort) {
      const isDesc = effectiveQuery.sort.startsWith('-');
      const key = isDesc ? effectiveQuery.sort.slice(1) : effectiveQuery.sort;
      const col = columns.find((c) => c.key === key);
      chips.push({
        key: 'sort',
        label: `Rendezés: ${col?.label ?? key} (${isDesc ? '↓' : '↑'})`,
        clear: () => pushQuery({ sort: undefined }),
      });
    }
    return chips;
  }, [effectiveQuery, columns, pushQuery, pathname, router, searchParams]);

  const compact = variant === 'compact';
  const cellPad = compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        {toolbarLeading ? (
          <div className="flex flex-wrap items-center gap-2 lg:shrink-0">{toolbarLeading}</div>
        ) : null}
        <form
          className="flex min-w-0 flex-1 gap-2 lg:min-w-[12rem]"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            pushQuery({ search: String(fd.get('search') ?? '').trim() || undefined });
          }}
        >
          <input
            name="search"
            defaultValue={effectiveQuery.search ?? ''}
            placeholder="Keresés…"
            className="bg-background focus-visible:ring-ring h-9 min-w-0 flex-1 rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
          />
          <button
            type="submit"
            className="bg-primary text-primary-foreground inline-flex h-9 shrink-0 items-center rounded-md px-3 text-sm font-medium"
          >
            Keresés
          </button>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          {filterable.length > 0 && (
            <button
              type="button"
              onClick={() => setPanel('filters')}
              className="bg-background inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm"
            >
              <FilterIcon className="size-2.5" />
              Szűrők
            </button>
          )}
          {sortable.length > 0 && (
            <button
              type="button"
              onClick={() => setPanel('sort')}
              className="bg-background inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm"
            >
              <ArrowDownUpIcon className="size-2.5" />
              Rendezés
            </button>
          )}
          <button
            type="button"
            onClick={() => setPanel('columns')}
            className="bg-background inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm"
          >
            <Columns3Icon className="size-2.5" />
            Oszlopok
          </button>
          {activeChips.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-muted-foreground inline-flex h-9 items-center gap-1 px-2 text-sm hover:underline"
            >
              <XIcon className="size-2.5" />
              Törlés
            </button>
          )}
          {toolbarExtra}
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.clear}
              className="bg-muted hover:bg-muted/80 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs"
            >
              {chip.label}
              <XIcon className="size-2.5" />
            </button>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full">
          <thead className="border-b">
            <tr>
              {selectable && (
                <th className={cn(cellPad, 'w-10')}>
                  <input
                    type="checkbox"
                    className="size-4 rounded border"
                    checked={allPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = somePageSelected;
                    }}
                    onChange={togglePageSelection}
                    aria-label="Összes kijelölése az oldalon"
                  />
                </th>
              )}
              {displayColumns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    cellPad,
                    'text-left font-medium',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center'
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.sortable ? (
                      <DataTableSortHeader
                        label={col.label}
                        sortKey={col.key}
                        currentSort={effectiveQuery.sort}
                        basePath={basePath}
                        queryString={queryString}
                      />
                    ) : (
                      col.label
                    )}
                    {col.headerHint ? <DataTableHeaderHint text={col.headerHint} /> : null}
                  </span>
                </th>
              ))}
              {rowOpen === 'both' && rowHref && (
                <th className={cn(cellPad, 'w-10')} aria-label="Műveletek" />
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={displayColumns.length + selectionColSpan}
                  className="px-3 py-6 text-center text-sm"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const href = rowHref?.(row);
                const rowKey = resolveRowKey(row, idx);
                const clickable = (rowOpen === 'sheet' || rowOpen === 'both') && !!rowDetail;
                const isSelected = selectable && selectedRowKeys.includes(rowKey);
                return (
                  <tr
                    key={rowKey}
                    className={cn(
                      'border-b last:border-b-0',
                      clickable && 'hover:bg-muted/40 cursor-pointer',
                      isSelected && 'bg-muted/30'
                    )}
                    onClick={() => clickable && handleRowClick(row)}
                  >
                    {selectable && (
                      <td className={cellPad} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="size-4 rounded border"
                          checked={isSelected}
                          onChange={() => toggleRowSelection(rowKey)}
                          aria-label={`Kijelölés: ${rowKey}`}
                        />
                      </td>
                    )}
                    {displayColumns.map((col) => {
                      const content = renderCell(row, col);
                      return (
                        <td
                          key={col.key}
                          className={cn(
                            cellPad,
                            col.align === 'right' && 'text-right',
                            col.align === 'center' && 'text-center'
                          )}
                          onClick={(e) => {
                            if (rowOpen === 'both' && col.key !== '_actions') e.stopPropagation();
                          }}
                        >
                          {rowOpen === 'navigate' && href ? (
                            <Link href={href} className="block">
                              {content}
                            </Link>
                          ) : (
                            content
                          )}
                        </td>
                      );
                    })}
                    {rowOpen === 'both' && href && (
                      <td className={cellPad} onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={href}
                          className="text-muted-foreground hover:text-foreground inline-flex"
                          title="Teljes oldal"
                        >
                          <ExternalLinkIcon className="size-2.5" />
                        </Link>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <DataTablePagination
        page={effectiveQuery.page ?? 1}
        pageSize={effectiveQuery.pageSize ?? 10}
        total={total}
        basePath={basePath}
        queryString={queryString}
      />

      <EntitySheet
        open={panel === 'filters'}
        onOpenChange={(o) => setPanel(o ? 'filters' : null)}
        title="Szűrők"
        size="sm"
      >
        <FilterPanel
          columns={filterable}
          searchParams={searchParams}
          pathname={pathname}
          router={router}
          onClose={() => setPanel(null)}
        />
      </EntitySheet>

      <EntitySheet
        open={panel === 'sort'}
        onOpenChange={(o) => setPanel(o ? 'sort' : null)}
        title="Rendezés"
        size="sm"
      >
        <SortPanel
          columns={sortable}
          currentSort={effectiveQuery.sort}
          pathname={pathname}
          searchParams={searchParams}
          router={router}
          onClose={() => setPanel(null)}
        />
      </EntitySheet>

      <EntitySheet
        open={panel === 'columns'}
        onOpenChange={(o) => setPanel(o ? 'columns' : null)}
        title="Oszlopok"
        size="sm"
      >
        <ColumnsPanel
          columns={columns}
          visibleKeys={visibleKeys}
          tableId={tableId}
          onChange={(keys) => {
            setVisibleKeys(keys);
            setTablePreferences(tableId, { visibleColumns: keys });
          }}
        />
      </EntitySheet>

      {rowDetail && detailRow && (
        <EntitySheet
          open={panel === 'detail'}
          onOpenChange={(o) => {
            if (!o) {
              setPanel(null);
              setDetailRow(null);
            }
          }}
          title={rowDetail.title?.(detailRow) ?? 'Részletek'}
          description={rowDetail.description?.(detailRow)}
          size="lg"
        >
          {rowDetail.render(detailRow)}
          {rowHref && (
            <div className="mt-4 border-t pt-4">
              <Link
                href={rowHref(detailRow)}
                className="text-primary inline-flex items-center gap-1 text-sm font-medium"
              >
                Teljes oldal
                <ExternalLinkIcon className="size-2.5" />
              </Link>
            </div>
          )}
        </EntitySheet>
      )}
    </div>
  );
}

function FilterPanel<T>({
  columns,
  searchParams,
  pathname,
  router,
  onClose,
}: {
  columns: Array<ColumnDef<T>>;
  searchParams: URLSearchParams;
  pathname: string;
  router: ReturnType<typeof useRouter>;
  onClose: () => void;
}) {
  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const next = new URLSearchParams(searchParams.toString());
    next.set('page', '1');
    for (const key of Array.from(next.keys())) {
      if (key.startsWith('f.')) next.delete(key);
    }
    for (const col of columns) {
      const type = col.type ?? 'string';
      if (type === 'number') {
        const min = String(fd.get(`f.${col.key}.min`) ?? '').trim();
        const max = String(fd.get(`f.${col.key}.max`) ?? '').trim();
        if (min) next.append(`f.${col.key}`, min);
        if (max) next.append(`f.${col.key}`, max);
        continue;
      }
      if (type === 'boolean') {
        const v = String(fd.get(`f.${col.key}`) ?? '');
        if (v && v !== 'all') next.set(`f.${col.key}`, v);
        continue;
      }
      if (type === 'enum' && col.enumValues) {
        const selected = col.enumValues
          .map((ev) => ev.value)
          .filter((val) => fd.get(`f.${col.key}.${val}`) === 'on');
        selected.forEach((v) => next.append(`f.${col.key}`, v));
        continue;
      }
      const raw = String(fd.get(`f.${col.key}`) ?? '').trim();
      if (raw) next.set(`f.${col.key}`, raw);
    }
    router.push(`${pathname}?${next.toString()}`);
    onClose();
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {columns.map((col) => (
        <FilterField key={col.key} col={col} searchParams={searchParams} />
      ))}
      <button
        type="submit"
        className="bg-primary text-primary-foreground h-9 rounded-md px-3 text-sm font-medium"
      >
        Alkalmaz
      </button>
    </form>
  );
}

function FilterField<T>({
  col,
  searchParams,
}: {
  col: ColumnDef<T>;
  searchParams: URLSearchParams;
}) {
  const type = col.type ?? 'string';
  const label = col.label;

  if (type === 'boolean') {
    const cur = searchParams.get(`f.${col.key}`) ?? 'all';
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{label}</label>
        <select
          name={`f.${col.key}`}
          defaultValue={cur}
          className="bg-background h-9 rounded-md border px-2 text-sm"
        >
          <option value="all">Mind</option>
          <option value="true">Igen</option>
          <option value="false">Nem</option>
        </select>
      </div>
    );
  }

  if (type === 'number') {
    const vals = searchParams.getAll(`f.${col.key}`);
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{label}</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            name={`f.${col.key}.min`}
            type="number"
            placeholder="Min"
            defaultValue={vals[0] ?? ''}
            className="bg-background h-9 rounded-md border px-2 text-sm"
          />
          <input
            name={`f.${col.key}.max`}
            type="number"
            placeholder="Max"
            defaultValue={vals[1] ?? ''}
            className="bg-background h-9 rounded-md border px-2 text-sm"
          />
        </div>
      </div>
    );
  }

  if (type === 'enum' && col.enumValues?.length) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex flex-col gap-1">
          {col.enumValues.map((ev) => (
            <label key={ev.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={`f.${col.key}.${ev.value}`}
                defaultChecked={searchParams.getAll(`f.${col.key}`).includes(ev.value)}
              />
              {ev.label}
            </label>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`f.${col.key}`} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={`f.${col.key}`}
        name={`f.${col.key}`}
        defaultValue={searchParams.get(`f.${col.key}`) ?? ''}
        className="bg-background h-9 rounded-md border px-2 text-sm"
      />
    </div>
  );
}

function SortPanel<T>({
  columns,
  currentSort,
  pathname,
  searchParams,
  router,
  onClose,
}: {
  columns: Array<ColumnDef<T>>;
  currentSort?: string;
  pathname: string;
  searchParams: URLSearchParams;
  router: ReturnType<typeof useRouter>;
  onClose: () => void;
}) {
  const apply = (key: string, dir: 'asc' | 'desc') => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('sort', dir === 'desc' ? `-${key}` : key);
    next.set('page', '1');
    router.push(`${pathname}?${next.toString()}`);
    onClose();
  };

  return (
    <ul className="flex flex-col gap-1">
      {columns.map((col) => {
        const isAsc = currentSort === col.key;
        const isDesc = currentSort === `-${col.key}`;
        return (
          <li key={col.key} className="flex gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{col.label}</span>
            <button
              type="button"
              onClick={() => apply(col.key, 'asc')}
              className={cn(
                'h-8 rounded border px-2 text-xs',
                isAsc && 'bg-primary text-primary-foreground'
              )}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => apply(col.key, 'desc')}
              className={cn(
                'h-8 rounded border px-2 text-xs',
                isDesc && 'bg-primary text-primary-foreground'
              )}
            >
              ↓
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ColumnsPanel<T>({
  columns,
  visibleKeys,
  tableId,
  onChange,
}: {
  columns: Array<ColumnDef<T>>;
  visibleKeys: string[];
  tableId: string;
  onChange: (keys: string[]) => void;
}) {
  const hideable = getHideableColumns(columns);
  const alwaysVisible = columns.filter((c) => c.hideable === false);

  const toggle = (key: string) => {
    const next = visibleKeys.includes(key)
      ? visibleKeys.filter((k) => k !== key)
      : [...visibleKeys, key];
    if (next.length === 0) return;
    onChange(next);
    setTablePreferences(tableId, { visibleColumns: next });
  };

  const showAll = () => {
    const next = columns.map((c) => c.key);
    onChange(next);
    setTablePreferences(tableId, { visibleColumns: next });
  };

  const resetDefault = () => {
    const next = getFactoryDefaultVisibleColumns(columns);
    onChange(next);
    setTablePreferences(tableId, { visibleColumns: next });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={showAll}
          className="bg-background h-8 rounded-md border px-2.5 text-xs"
        >
          Összes megjelenítése
        </button>
        <button
          type="button"
          onClick={resetDefault}
          className="bg-background h-8 rounded-md border px-2.5 text-xs"
        >
          Alapértelmezés
        </button>
      </div>

      {alwaysVisible.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">Mindig látható</p>
          <ul className="flex flex-col gap-1.5">
            {alwaysVisible.map((col) => (
              <li key={col.key} className="text-muted-foreground text-sm">
                {columnPickerLabel(col)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">
          Megjeleníthető oszlopok ({hideable.length})
        </p>
        <ul className="flex max-h-[min(60vh,24rem)] flex-col gap-1.5 overflow-y-auto pr-1">
          {hideable.map((col) => (
            <li key={col.key}>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={visibleKeys.includes(col.key)}
                  onChange={() => toggle(col.key)}
                />
                <span className="min-w-0 flex-1">{columnPickerLabel(col)}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
