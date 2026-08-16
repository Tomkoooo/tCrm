import type { PermissionModule } from '@crm/rbac';

export const INVENTORY_READ_PERMISSION_KEYS = ['inventory:read'] as const;
export const INVENTORY_WRITE_PERMISSION_KEYS = ['inventory:write'] as const;
export const INVENTORY_IMPORT_PERMISSION_KEYS = ['inventory:import'] as const;
export const INVENTORY_DELETE_PERMISSION_KEYS = ['inventory:delete'] as const;

export const SUPPLIER_READ_PERMISSION_KEYS = [
  'suppliers:read',
  'suppliers:manage',
  'inventory:import',
  'inventory:write',
] as const;

export const SUPPLIER_MANAGE_PERMISSION_KEYS = [
  'suppliers:manage',
  'inventory:import',
  'inventory:write',
] as const;

export const WAREHOUSE_READ_PERMISSION_KEYS = ['warehouses:read', 'warehouses:manage'] as const;
export const WAREHOUSE_MANAGE_PERMISSION_KEYS = ['warehouses:manage'] as const;

export const inventoryPermissions: PermissionModule = {
  moduleKey: 'inventory',
  permissions: [
    {
      key: 'inventory:read',
      label: 'View Inventory',
      group: 'inventory',
      description: 'Browse products, categories, and stock',
      isSystem: true,
    },
    {
      key: 'inventory:write',
      label: 'Manage Inventory',
      group: 'inventory',
      description: 'Create and edit products, categories, and stock',
      isSystem: true,
    },
    {
      key: 'inventory:import',
      label: 'Import Inventory',
      group: 'inventory',
      description: 'Bulk import inventory from Excel',
      isSystem: true,
    },
    {
      key: 'inventory:delete',
      label: 'Delete Products',
      group: 'inventory',
      description: 'Permanently delete products',
      isSystem: true,
    },
    {
      key: 'warehouses:read',
      label: 'View Warehouses',
      group: 'inventory',
      description: 'View warehouses and stock levels',
      isSystem: true,
    },
    {
      key: 'warehouses:manage',
      label: 'Manage Warehouses',
      group: 'inventory',
      description: 'Create and edit warehouses',
      isSystem: true,
    },
    {
      key: 'suppliers:read',
      label: 'View Suppliers',
      group: 'inventory',
      description: 'View supplier partners',
      isSystem: true,
    },
    {
      key: 'suppliers:manage',
      label: 'Manage Suppliers',
      group: 'inventory',
      description: 'Create and edit suppliers (import partners)',
      isSystem: true,
    },
  ],
  roleTemplates: [
    {
      key: 'viewer',
      name: 'Viewer',
      description: 'Read-only access',
      permissionKeys: ['inventory:read', 'warehouses:read', 'suppliers:read'],
      isSystem: true,
    },
  ],
};
