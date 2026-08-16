import type { PermissionModule } from '@crm/rbac';

export const LOGISTICS_READ_PERMISSION_KEYS = [
  'logistics:read',
  'logistics:write',
  'logistics:scope_all',
] as const;

export const LOGISTICS_WRITE_PERMISSION_KEYS = ['logistics:write'] as const;

export const LOGISTICS_VEHICLES_READ_PERMISSION_KEYS = [
  'logistics:read',
  'logistics:write',
  'logistics:vehicles:read',
] as const;

export const LOGISTICS_VEHICLES_REPORT_PERMISSION_KEYS = ['logistics:vehicles:report'] as const;

export const logisticsPermissions: PermissionModule = {
  moduleKey: 'logistics',
  permissions: [
    {
      key: 'logistics:read',
      label: 'View Logistics',
      group: 'logistics',
      description: 'View logistics data',
      isSystem: true,
    },
    {
      key: 'logistics:write',
      label: 'Manage Logistics',
      group: 'logistics',
      description: 'Manage logistics operations',
      isSystem: true,
    },
    {
      key: 'logistics:scope_all',
      label: 'All logistics sites',
      group: 'logistics',
      description: 'View and manage shipments for all warehouses (not scoped to assignment)',
      isSystem: true,
    },
    {
      key: 'logistics:vehicles:read',
      label: 'View vehicle fleet',
      group: 'logistics',
      description: 'View fleet list and vehicle details (no movements, jobs, or reservations)',
      isSystem: true,
    },
    {
      key: 'logistics:vehicles:report',
      label: 'Report vehicle incidents',
      group: 'logistics',
      description: 'Submit incident descriptions and photos on visible vehicles',
      isSystem: true,
    },
  ],
  roleTemplates: [
    {
      key: 'viewer',
      name: 'Viewer',
      description: 'Read-only access',
      permissionKeys: ['logistics:read', 'logistics:vehicles:read'],
      isSystem: true,
    },
  ],
};
