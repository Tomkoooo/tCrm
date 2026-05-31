declare module '@crm/core' {
  export type ParseIssue = { row: number; field?: string; message: string };
  export type ParseResult = {
    rows: unknown[];
    errors: ParseIssue[];
    warnings: ParseIssue[];
  };

  export type ImportParseConfig = {
    sheetName?: string;
    columnMap?: Record<string, string | null>;
    allowMissingSupplier?: boolean;
  };

  export function parseInventoryXlsx(
    buffer: ArrayBuffer,
    options?: ImportParseConfig
  ): Promise<ParseResult>;
  export function commitInventoryImport(
    parsed: ParseResult,
    userId: string
  ): Promise<Record<string, unknown>>;
}
