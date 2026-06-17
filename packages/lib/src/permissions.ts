/** Keys that grant read access to supplier list/detail (aligned with sidebar). */
export const SUPPLIER_READ_PERMISSION_KEYS = [
  'suppliers:read',
  'suppliers:manage',
  'inventory:import',
  'inventory:write',
] as const;

/** Keys that grant create/edit/delete on suppliers (import partners). */
export const SUPPLIER_MANAGE_PERMISSION_KEYS = [
  'suppliers:manage',
  'inventory:import',
  'inventory:write',
] as const;

/** Browse media library (admin page, gallery tab). */
export const MEDIA_READ_PERMISSION_KEYS = ['media:read', 'inventory:read'] as const;

/** Upload files and register external image links. */
export const MEDIA_UPLOAD_PERMISSION_KEYS = ['media:upload', 'inventory:write'] as const;

/** Delete media from the library. */
export const MEDIA_DELETE_PERMISSION_KEYS = ['media:delete'] as const;

/** Browse secret projects (Titoktár) — any secrets module permission grants nav access. */
export const SECRETS_READ_PERMISSION_KEYS = [
  'secrets:read',
  'secrets:write',
  'secrets:delete',
  'secrets:manage',
] as const;

/** Create/edit secret projects and key-value pairs. */
export const SECRETS_WRITE_PERMISSION_KEYS = ['secrets:write', 'secrets:manage'] as const;

/** Delete secret projects or entries. */
export const SECRETS_DELETE_PERMISSION_KEYS = ['secrets:delete', 'secrets:manage'] as const;

/** Configure sharing on secret projects (all projects). */
export const SECRETS_MANAGE_PERMISSION_KEYS = ['secrets:manage'] as const;

/** Access accounting / HR module navigation. */
export const ACCOUNTING_NAV_PERMISSION_KEYS = [
  'accounting:read',
  'accounting:write',
  'hr:read',
  'hr:write',
  'hr:approve',
  'hr:reports',
  'hr:self',
  'hr:teams:read',
  'hr:teams:write',
] as const;

/** View HR data (employees, schedules, requests). */
export const HR_READ_PERMISSION_KEYS = [
  'hr:read',
  'hr:write',
  'hr:approve',
  'hr:reports',
  'hr:teams:read',
  'hr:teams:write',
] as const;

/** Manage companies, employees, schedules. */
export const HR_WRITE_PERMISSION_KEYS = ['hr:write'] as const;

/** Approve or reject HR requests. */
export const HR_APPROVE_PERMISSION_KEYS = ['hr:approve', 'hr:write'] as const;

/** Monthly summaries and export. */
export const HR_REPORTS_PERMISSION_KEYS = ['hr:reports', 'hr:write'] as const;

/** Employee self-service. */
export const HR_SELF_PERMISSION_KEYS = ['hr:self'] as const;

/** View logistics overview, movements, reservations, and jobs. */
export const LOGISTICS_READ_PERMISSION_KEYS = [
  'logistics:read',
  'logistics:write',
  'logistics:scope_all',
] as const;

/** View vehicle fleet list and detail. */
export const LOGISTICS_VEHICLES_READ_PERMISSION_KEYS = [
  'logistics:read',
  'logistics:write',
  'logistics:vehicles:read',
] as const;

/** Report vehicle incidents (description + photos). */
export const LOGISTICS_VEHICLES_REPORT_PERMISSION_KEYS = ['logistics:vehicles:report'] as const;

export function hasAnyPermission(userKeys: string[], keys: readonly string[]): boolean {
  return keys.some((key) => userKeys.includes(key));
}
