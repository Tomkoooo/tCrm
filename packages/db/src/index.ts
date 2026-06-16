export { connectDB, getNativeClient, getUploadsBucket, DB_NAME } from './connection';
export { normalizeMongoUri } from './mongo-uri';
export {
  isStandaloneMongoError,
  runWithOptionalTransaction,
} from './run-with-optional-transaction';
export * from './models';
export * from './repositories';
export { ensureBaselineRbac, seedDatabase, seedMailTemplates } from './seed';
export type { SeedMailTemplatesOptions } from './seed';
export { ensureBaselineRbacOnce } from './rbac-sync';
export {
  migrateEmployeeMultiCompanyIndexes,
  ensureEmployeeMultiCompanyIndexesOnce,
} from './employee-index-sync';
export { hasAnyAdminUser } from './system';
export {
  getAdminRoleId,
  countActiveAdminUsers,
  userHasAdminRole,
  isLastActiveAdmin,
} from './users';
export {
  getBranding,
  updateBranding,
  brandingMediaUrl,
  DEFAULT_BRANDING,
  type BrandingSettings,
  type UpdateBrandingInput,
} from './branding';
