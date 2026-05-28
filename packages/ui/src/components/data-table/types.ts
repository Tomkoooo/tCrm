import type React from 'react';

export type ColumnType = 'string' | 'number' | 'date' | 'boolean' | 'enum';

export interface ColumnDef<T> {
  key: string;
  label: string;
  type?: ColumnType;
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  enumValues?: Array<{ value: string; label: string }>;
  align?: 'left' | 'right' | 'center';
  render?: (value: unknown, row: T) => React.ReactNode;
}

export interface DataTableQuery {
  search?: string;
  sort?: string; // key or -key
  page?: number;
  pageSize?: number;
  filters?: Record<string, string | string[]>;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Array<ColumnDef<T>>;
  query: DataTableQuery;
  total: number;
  basePath: string;
  rowHref?: (row: T) => string;
  emptyMessage?: string;
}
