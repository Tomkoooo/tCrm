import { connectDB, Permission, Role } from '@crm/db-core';
import type { PermissionModule, RoleTemplateDescriptor } from './types';
import { getRegisteredModules } from './registry';

async function upsertRole(
  role: RoleTemplateDescriptor,
  permissionMap: Map<string, string>
): Promise<void> {
  const permissionIds = role.permissionKeys
    .map((key) => permissionMap.get(key))
    .filter((id): id is string => Boolean(id));

  const existing = await Role.findOne({ key: role.key }).exec();
  if (existing) {
    existing.permissionIds = permissionIds as unknown as typeof existing.permissionIds;
    existing.name = role.name;
    existing.description = role.description;
    await existing.save();
  } else {
    await Role.create({
      key: role.key,
      name: role.name,
      description: role.description,
      permissionIds: permissionIds as never,
      isSystem: role.isSystem,
    });
  }
}

/**
 * Upserts every registered module's permissions, then a built-in "admin" role that
 * always covers every currently-registered permission (recomputed each sync — no
 * hardcoded flat permission list to keep in sync by hand), plus each module's own
 * role templates.
 */
export async function ensurePermissionsSynced(modules: PermissionModule[]): Promise<void> {
  await connectDB();

  const permissionMap = new Map<string, string>();
  const allKeys: string[] = [];

  for (const mod of modules) {
    for (const perm of mod.permissions) {
      allKeys.push(perm.key);
      const existing = await Permission.findOne({ key: perm.key }).exec();
      if (existing) {
        existing.label = perm.label;
        existing.group = perm.group;
        existing.description = perm.description;
        existing.isSystem = perm.isSystem ?? true;
        await existing.save();
        permissionMap.set(perm.key, existing._id.toString());
      } else {
        const created = await Permission.create({
          key: perm.key,
          label: perm.label,
          group: perm.group,
          description: perm.description,
          isSystem: perm.isSystem ?? true,
        });
        permissionMap.set(perm.key, created._id.toString());
      }
    }
  }

  // Multiple modules can contribute to the same role key (e.g. every module adding
  // its own read-only keys to "viewer") — merge by key instead of last-write-wins.
  const roleMerges = new Map<string, RoleTemplateDescriptor>();
  for (const mod of modules) {
    for (const role of mod.roleTemplates ?? []) {
      const existing = roleMerges.get(role.key);
      if (existing) {
        existing.permissionKeys = [
          ...new Set([...existing.permissionKeys, ...role.permissionKeys]),
        ];
      } else {
        roleMerges.set(role.key, { ...role, permissionKeys: [...role.permissionKeys] });
      }
    }
  }
  roleMerges.set('admin', {
    key: 'admin',
    name: 'Administrator',
    description: 'Full system access',
    permissionKeys: allKeys,
    isSystem: true,
  });

  for (const role of roleMerges.values()) {
    await upsertRole(role, permissionMap);
  }
}

const SYNCED = Symbol.for('crm.rbacSynced');

/** Safe to call from the dashboard layout on every request — runs the sync once per process. */
export async function ensurePermissionsSyncedOnce(): Promise<void> {
  const g = globalThis as typeof globalThis & { [SYNCED]?: boolean };
  if (g[SYNCED]) return;
  await ensurePermissionsSynced(getRegisteredModules());
  g[SYNCED] = true;
}
