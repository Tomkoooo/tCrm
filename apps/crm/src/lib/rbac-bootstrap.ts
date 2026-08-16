import {
  registerPermissionModule,
  ensurePermissionsSyncedOnce,
  ensurePermissionsSynced,
  getRegisteredModules,
} from '@crm/rbac';
import { enginePermissions } from '@crm/admin';
import { mediaPermissions } from '@crm/media';
import { inventoryPermissions } from '@crm/inventory/permissions';
import { logisticsPermissions } from '@crm/logistics/permissions';

[enginePermissions, mediaPermissions, inventoryPermissions, logisticsPermissions].forEach(
  registerPermissionModule
);

export { ensurePermissionsSyncedOnce as ensureRbacBootstrapped };

/** Force a re-sync regardless of the once-per-process guard (admin "sync now" action). */
export async function resyncRbac(): Promise<void> {
  await ensurePermissionsSynced(getRegisteredModules());
}
