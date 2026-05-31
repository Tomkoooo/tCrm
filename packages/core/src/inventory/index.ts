export { INVENTORY_COLUMNS } from './excel-columns';
export type { InventoryColumn } from './excel-columns';

export {
  parseInventoryXlsx,
  parseInventoryRows,
  commitInventoryImport,
  validateImportCategorySlugs,
  validateImportSupplierSlugs,
  prepareImportRows,
  resolveRowSupplierKey,
  type PrepareImportResult,
  type ParseIssue,
  type ParsedInventoryRow,
  type ParseResult,
  type ImportReport,
  type ImportMatchKey,
  type ImportMergeField,
  type ImportMergeOptions,
  type ImportCommitOptions,
} from './import';

export { exportInventoryXlsx, type InventoryExportEnrichment } from './export';
export {
  getImportTemplateXlsx,
  IMPORT_TEMPLATE_SHEET,
  IMPORT_GUIDE_SHEET,
} from './import-template';

export {
  getInventoryDashboardSummary,
  type InventoryDashboardSummary,
  type InventoryDashboardOptions,
} from './dashboard';

export {
  hasGlobalProductWarehouseScope,
  getWarehouseIdsForUser,
  buildProductWarehouseFilter,
  mergeProductListFilter,
} from './product-warehouse-scope';

export { resolveRowWarehouseKeys } from './import';

export {
  WAREHOUSE_STOCK_COLUMNS,
  warehouseKeyFromExcelColumn,
  warehouseKeysFromStockColumns,
  headersIncludeWarehouseStock,
  excelColumnFromWarehouseKey,
} from './warehouse-columns';

export {
  applyBulkProductOperation,
  type BulkProductOperation,
  type BulkUpdateResult,
  type BulkUpdateScope,
  type BulkStockMode,
} from './bulk-update';

export { syncProductWarehouseIds, reconcileAllProductWarehouseIds } from './sync-warehouse-ids';

export {
  readImportWorkbook,
  readImportSheetRows,
  preprocessImportRows,
  buildAutoColumnMap,
  detectImportGaps,
  listImportCanonicalFields,
  normalizeImportSlug,
  type ImportCanonicalField,
  type ImportColumnMap,
  type ImportParseConfig,
  type ImportSkuMode,
  type SupplierSkuCutConfig,
  type ImportWorkbookInspect,
  type ImportCanonicalFieldMeta,
} from './import-config';

export {
  generateInternalSku,
  deriveSupplierSkuFromCrmSku,
  deriveSupplierSkuFromSm,
  normalizeDigits,
  type CategorySkuSettings,
  type SupplierSkuCutOptions,
} from './sku';

export {
  sha256Hex,
  normalizeMediaUrl,
  filenameFromUrl,
  findFileMediaByHash,
  uploadFileToMedia,
  resolveOrCreateLinkMedia,
  resolveLinkUrlsToMediaIds,
  syncMediaUsage,
  setEntityMediaIds,
  listMedia,
  mediaPreviewPath,
  getMediaById,
  deleteMediaById,
  migrateGridFsIdToMedia,
  filterFileMediaIds,
  linkUrlsFromMediaIds,
  type MediaListItem,
  type MediaUsageRef,
} from './media';
