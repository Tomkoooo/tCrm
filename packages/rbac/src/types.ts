export type PermissionDescriptor = {
  key: string;
  label: string;
  group: string;
  description?: string;
  isSystem?: boolean;
};

export type RoleTemplateDescriptor = {
  key: string;
  name: string;
  description?: string;
  permissionKeys: string[];
  isSystem?: boolean;
};

/** A module (engine slice or business module) registers exactly one of these at boot. */
export type PermissionModule = {
  moduleKey: string;
  permissions: PermissionDescriptor[];
  roleTemplates?: RoleTemplateDescriptor[];
};
