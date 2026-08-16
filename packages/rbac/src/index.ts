export type { PermissionDescriptor, RoleTemplateDescriptor, PermissionModule } from './types';
export { registerPermissionModule, getRegisteredModules, clearRegistryForTests } from './registry';
export { ensurePermissionsSynced, ensurePermissionsSyncedOnce } from './bootstrap';
