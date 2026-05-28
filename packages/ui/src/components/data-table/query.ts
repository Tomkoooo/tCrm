import { parsePagination } from '@crm/lib/utils';
import type { ColumnDef, DataTableQuery } from './types';

export function parseDataTableQuery(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>
): DataTableQuery {
  const get = (key: string): string | undefined => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key) ?? undefined;
    }
    const v = searchParams[key];
    if (Array.isArray(v)) return v[0];
    return v;
  };

  const search = (get('search') ?? '').trim() || undefined;
  const sort = (get('sort') ?? '').trim() || undefined;

  const page = Math.max(1, parseInt(get('page') ?? '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(get('pageSize') ?? '10', 10) || 10));

  const filters: Record<string, string | string[]> = {};

  if (searchParams instanceof URLSearchParams) {
    for (const [k, v] of searchParams.entries()) {
      if (!k.startsWith('f.')) continue;
      const key = k.slice(2);
      if (filters[key] === undefined) filters[key] = v;
      else if (Array.isArray(filters[key])) (filters[key] as string[]).push(v);
      else filters[key] = [filters[key] as string, v];
    }
  } else {
    for (const [k, v] of Object.entries(searchParams)) {
      if (!k.startsWith('f.')) continue;
      const key = k.slice(2);
      if (v === undefined) continue;
      filters[key] = v;
    }
  }

  return { search, sort, page, pageSize, filters };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildDataTableMongoQuery<T>(
  query: DataTableQuery,
  columns: Array<ColumnDef<T>>
): { filter: Record<string, unknown>; sort: Record<string, 1 | -1>; skip: number; limit: number } {
  const { pageSize, skip } = parsePagination(
    { page: String(query.page ?? 1), pageSize: String(query.pageSize ?? 10) },
    { page: 1, pageSize: 10 }
  );

  const filter: Record<string, unknown> = {};

  // Filters
  const filters = query.filters ?? {};
  for (const [key, raw] of Object.entries(filters)) {
    const col = columns.find((c) => c.key === key);
    if (!col || !col.filterable) continue;

    const type = col.type ?? 'string';
    const values = Array.isArray(raw) ? raw : [raw];

    if (type === 'boolean') {
      const v = values[0];
      if (v === 'true') filter[key] = true;
      else if (v === 'false') filter[key] = false;
      continue;
    }

    if (type === 'number') {
      const min = values[0] ? Number(values[0]) : undefined;
      const max = values[1] ? Number(values[1]) : undefined;
      const range: Record<string, number> = {};
      if (min !== undefined && !Number.isNaN(min)) range.$gte = min;
      if (max !== undefined && !Number.isNaN(max)) range.$lte = max;
      if (Object.keys(range).length > 0) filter[key] = range;
      continue;
    }

    if (type === 'enum') {
      const cleaned = values.map((v) => String(v)).filter(Boolean);
      if (cleaned.length === 1) filter[key] = cleaned[0];
      else if (cleaned.length > 1) filter[key] = { $in: cleaned };
      continue;
    }

    // string default
    const v = String(values[0] ?? '').trim();
    if (v) filter[key] = { $regex: escapeRegex(v), $options: 'i' };
  }

  // Search: $text if available, else regex across searchable columns
  if (query.search) {
    const searchable = columns.filter((c) => c.searchable);
    if (searchable.length > 0) {
      const or = searchable.map((c) => ({
        [c.key]: { $regex: escapeRegex(query.search!), $options: 'i' },
      }));
      filter.$and = filter.$and ? [...(filter.$and as unknown[]), { $or: or }] : [{ $or: or }];
    } else {
      filter.$text = { $search: query.search };
    }
  }

  // Sort
  const sort: Record<string, 1 | -1> = {};
  if (query.sort) {
    const isDesc = query.sort.startsWith('-');
    const key = isDesc ? query.sort.slice(1) : query.sort;
    const col = columns.find((c) => c.key === key);
    if (col?.sortable) sort[key] = isDesc ? -1 : 1;
  }
  if (Object.keys(sort).length === 0) sort.createdAt = -1;

  return { filter, sort, skip, limit: pageSize };
}
