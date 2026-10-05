import type { PermissionModule } from '@crm/rbac';

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

export const secretsPermissions: PermissionModule = {
  moduleKey: 'secrets',
  permissions: [
    {
      key: 'secrets:read',
      label: 'View Secrets',
      group: 'secrets',
      description: 'View secret projects and keys (values on demand)',
      isSystem: true,
    },
    {
      key: 'secrets:write',
      label: 'Manage Secrets',
      group: 'secrets',
      description: 'Create and edit secret projects and key-value pairs',
      isSystem: true,
    },
    {
      key: 'secrets:delete',
      label: 'Delete Secrets',
      group: 'secrets',
      description: 'Delete secret projects and entries',
      isSystem: true,
    },
    {
      key: 'secrets:manage',
      label: 'Configure Secret Access',
      group: 'secrets',
      description: 'Manage sharing and access on all secret projects',
      isSystem: true,
    },
  ],
};
