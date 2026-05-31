import { buildDataTableMongoQuery, parseDataTableQuery, type ColumnDef } from '@crm/ui';
import type { ProductTableRow } from './product-table-columns';
import { buildScopedProductFilter } from './warehouse-scope';

export type ProductListFilterParams = {
  rawParams: Record<string, string | string[] | undefined>;
  columns: Array<ColumnDef<ProductTableRow>>;
  showAllProducts: boolean;
  warehouseIdParam?: string;
};

/** Mongo filter for inventory product list / export / bulk — matches current table scope. */
export async function buildProductListFilter({
  rawParams,
  columns,
  showAllProducts,
  warehouseIdParam,
}: ProductListFilterParams): Promise<Record<string, unknown>> {
  const query = parseDataTableQuery(rawParams);
  const { filter } = buildDataTableMongoQuery(query, columns);
  const activeFilter = showAllProducts ? {} : { isActive: true };
  return buildScopedProductFilter({ ...filter, ...activeFilter }, warehouseIdParam);
}

export function parseSkuListParam(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  return [
    ...new Set(
      value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ];
}
