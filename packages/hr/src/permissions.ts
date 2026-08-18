import type { PermissionModule } from '@crm/rbac';

export const HR_READ_PERMISSION_KEYS = ['hr:read', 'hr:write', 'hr:approve'] as const;
export const HR_WRITE_PERMISSION_KEYS = ['hr:write'] as const;
export const HR_APPROVE_PERMISSION_KEYS = ['hr:approve', 'hr:write'] as const;
export const HR_SELF_PERMISSION_KEYS = ['hr:self'] as const;
export const HR_NAV_PERMISSION_KEYS = ['hr:read', 'hr:write', 'hr:approve'] as const;

export const hrPermissions: PermissionModule = {
  moduleKey: 'hr',
  permissions: [
    {
      key: 'hr:read',
      label: 'View HR',
      group: 'hr',
      description: 'View people directory, calendar, and hours',
      isSystem: true,
    },
    {
      key: 'hr:write',
      label: 'Manage HR',
      group: 'hr',
      description: 'Create and edit people; approve leave',
      isSystem: true,
    },
    {
      key: 'hr:approve',
      label: 'Approve leave',
      group: 'hr',
      description: 'Approve or reject leave and sick requests',
      isSystem: true,
    },
    {
      key: 'hr:self',
      label: 'My HR',
      group: 'hr',
      description:
        'Legacy key. Saját feladataim is available to any user with a linked employee profile.',
      isSystem: true,
    },
  ],
  roleTemplates: [
    {
      key: 'viewer',
      name: 'Viewer',
      description: 'Read-only access',
      permissionKeys: ['hr:read'],
      isSystem: true,
    },
  ],
};
