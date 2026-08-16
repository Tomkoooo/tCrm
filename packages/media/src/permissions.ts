import type { PermissionModule } from '@crm/rbac';

export const MEDIA_READ_PERMISSION_KEYS = ['media:read'] as const;
export const MEDIA_UPLOAD_PERMISSION_KEYS = ['media:upload'] as const;
export const MEDIA_DELETE_PERMISSION_KEYS = ['media:delete'] as const;

export const mediaPermissions: PermissionModule = {
  moduleKey: 'media',
  permissions: [
    {
      key: 'media:read',
      label: 'View Media Library',
      group: 'media',
      description: 'Browse and search the central media library',
      isSystem: true,
    },
    {
      key: 'media:upload',
      label: 'Upload Media',
      group: 'media',
      description: 'Upload images/PDFs and register external image URLs',
      isSystem: true,
    },
    {
      key: 'media:delete',
      label: 'Delete Media',
      group: 'media',
      description: 'Remove media from the library',
      isSystem: true,
    },
  ],
  roleTemplates: [
    {
      key: 'viewer',
      name: 'Viewer',
      description: 'Read-only access',
      permissionKeys: ['media:read'],
      isSystem: true,
    },
  ],
};
