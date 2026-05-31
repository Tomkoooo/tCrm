/** Excel stock columns → CRM `Warehouse.key` */
export const WAREHOUSE_STOCK_COLUMNS = ['warehouse 1.', 'warehouse 2.', 'warehouse 3.'] as const;

export type WarehouseStockColumn = (typeof WAREHOUSE_STOCK_COLUMNS)[number];

const COLUMN_TO_WAREHOUSE_KEY: Record<WarehouseStockColumn, string> = {
  'warehouse 1.': 'kispest',
  'warehouse 2.': 'erzsebet',
  'warehouse 3.': 'recsei',
};

const WAREHOUSE_KEY_TO_COLUMN: Record<string, WarehouseStockColumn> = {
  kispest: 'warehouse 1.',
  erzsebet: 'warehouse 2.',
  recsei: 'warehouse 3.',
};

export function warehouseKeyFromExcelColumn(columnName: string): string | undefined {
  if (columnName in COLUMN_TO_WAREHOUSE_KEY) {
    return COLUMN_TO_WAREHOUSE_KEY[columnName as WarehouseStockColumn];
  }
  return undefined;
}

export function excelColumnFromWarehouseKey(
  warehouseKey: string
): WarehouseStockColumn | undefined {
  return WAREHOUSE_KEY_TO_COLUMN[warehouseKey.trim().toLowerCase()];
}

export function isWarehouseStockColumn(columnName: string): boolean {
  return WAREHOUSE_STOCK_COLUMNS.includes(columnName as WarehouseStockColumn);
}

export function warehouseKeysFromStockColumns(
  warehouses: Record<string, number> | undefined
): string[] {
  if (!warehouses) return [];
  const keys = new Set<string>();
  for (const col of Object.keys(warehouses)) {
    const key = warehouseKeyFromExcelColumn(col);
    if (key) keys.add(key);
  }
  return [...keys];
}

export function headersIncludeWarehouseStock(headers: string[]): boolean {
  return WAREHOUSE_STOCK_COLUMNS.some((col) => headers.includes(col));
}
