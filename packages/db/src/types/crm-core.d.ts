declare module '@crm/core' {
  export type ParseIssue = { row: number; field?: string; message: string };
  export type ParseResult = {
    rows: unknown[];
    errors: ParseIssue[];
    warnings: ParseIssue[];
  };

  export function parseInventoryXlsx(buffer: ArrayBuffer): ParseResult;
  export function commitInventoryImport(
    parsed: ParseResult,
    userId: string
  ): Promise<Record<string, unknown>>;
}
