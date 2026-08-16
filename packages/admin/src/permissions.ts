import type { PermissionModule } from '@crm/rbac';

export const enginePermissions: PermissionModule = {
  moduleKey: 'engine',
  permissions: [
    {
      key: 'admin:access',
      label: 'Admin Access',
      group: 'admin',
      description: 'Access admin section',
      isSystem: true,
    },
    {
      key: 'users:read',
      label: 'View Users',
      group: 'users',
      description: 'View user list',
      isSystem: true,
    },
    {
      key: 'users:write',
      label: 'Manage Users',
      group: 'users',
      description: 'Create and edit users',
      isSystem: true,
    },
    {
      key: 'roles:manage',
      label: 'Manage Roles',
      group: 'admin',
      description: 'Manage roles and permissions',
      isSystem: true,
    },
    {
      key: 'mail:manage',
      label: 'Manage Mail Templates',
      group: 'admin',
      description: 'Edit email templates and notification rules',
      isSystem: true,
    },
    {
      key: 'mail:send',
      label: 'Send System Mail',
      group: 'admin',
      description: 'Trigger invitation and password reset emails',
      isSystem: true,
    },
  ],
  roleTemplates: [
    {
      key: 'viewer',
      name: 'Viewer',
      description: 'Read-only access',
      permissionKeys: [],
      isSystem: true,
    },
  ],
};
