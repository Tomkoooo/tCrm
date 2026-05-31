declare module '@crm/core' {
  export type ParseIssue = { row: number; field?: string; message: string };
  export type ParseResult = {
    rows: unknown[];
    errors: ParseIssue[];
    warnings: ParseIssue[];
  };

  export type ImportColumnMap = Record<string, string | null>;

  export type ImportSkuMode = 'from_supplier_sku' | 'from_sm';

  export type SupplierSkuCutConfig = {
    supplierSkuLength?: number;
    digitCount?: number;
    stripCategoryPrefix?: boolean;
  };

  export type ImportParseConfig = {
    sheetName?: string;
    columnMap?: ImportColumnMap;
    allowMissingSupplier?: boolean;
    skuMode?: ImportSkuMode;
    supplierSkuCut?: SupplierSkuCutConfig;
  };

  export type ImportWorkbookInspect = {
    sheetNames: string[];
    headersBySheet: Record<string, string[]>;
    sampleRowsBySheet: Record<string, Record<string, unknown>[]>;
  };

  export function readImportWorkbook(buffer: ArrayBuffer): ImportWorkbookInspect;
  export function buildAutoColumnMap(headers: string[]): ImportColumnMap;

  export function parseInventoryXlsx(
    buffer: ArrayBuffer,
    options?: ImportParseConfig
  ): Promise<ParseResult>;
  export function commitInventoryImport(
    parsed: ParseResult,
    userId: string,
    options?: ImportParseConfig
  ): Promise<Record<string, unknown>>;
}
