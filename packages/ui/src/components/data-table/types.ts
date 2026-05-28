import type React from 'react';

export type ColumnType = 'string' | 'number' | 'date' | 'boolean' | 'enum' | 'image';

export interface ColumnDef<T> {
  /** Row object key used for display and client-side tables */
  key: string;
  /** MongoDB path when row key differs (e.g. `names.en` for key `name_en`) */
  mongoKey?: string;
  label: string;
  /** Label in the column picker when `label` is empty (e.g. image columns) */
  columnPickerLabel?: string;
  type?: ColumnType;
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  enumValues?: Array<{ value: string; label: string }>;
  align?: 'left' | 'right' | 'center';
  hideable?: boolean;
  defaultVisible?: boolean;
  headerHint?: string;
  imageOptions?: {
    size?: 'sm' | 'md';
    /** Serializable alt field key — use from Server Components instead of `alt`. */
    altKey?: keyof T & string;
    alt?: (row: T) => string;
  };
  render?: (value: unknown, row: T) => React.ReactNode;
}

export interface DataTableQuery {
  search?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
  filters?: Record<string, string | string[]>;
}

export type DataTableMode = 'server' | 'client';
export type DataTableRowOpen = 'navigate' | 'sheet' | 'both';
export type DataTableVariant = 'default' | 'compact';

export interface DataTableRowDetail<T> {
  title?: (row: T) => string;
  description?: (row: T) => string;
  render: (row: T) => React.ReactNode;
}

export interface DataTableProps<T extends Record<string, unknown>> {
  mode?: DataTableMode;
  data: T[];
  columns: Array<ColumnDef<T>>;
  query: DataTableQuery;
  total: number;
  basePath: string;
  tableId: string;
  toolbarExtra?: React.ReactNode;
  rowHref?: (row: T) => string;
  rowDetail?: DataTableRowDetail<T>;
  rowOpen?: DataTableRowOpen;
  emptyMessage?: string;
  variant?: DataTableVariant;
}
