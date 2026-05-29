'use server';

import { requireAuth } from '@crm/auth';
import { connectDB, Role, User, Warehouse } from '@crm/db';

export type GroupedUserOption = {
  value: string;
  label: string;
  sublabel?: string;
};

export type GroupedUserGroup = {
  roleKey: string;
  roleName: string;
  options: GroupedUserOption[];
};

export async function searchUsersGroupedAction(
  query: string,
  options?: { warehouseId?: string; limit?: number }
): Promise<{ groups: GroupedUserGroup[] }> {
  await requireAuth();
  await connectDB();

  const q = query.trim();
  const limit = options?.limit ?? 40;
  const filter: Record<string, unknown> = { isActive: true };

  if (q.length >= 1) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: regex }, { email: regex }];
  }

  const users = await User.find(filter)
    .sort({ name: 1 })
    .limit(limit)
    .select({ name: 1, email: 1, roleIds: 1 })
    .lean()
    .exec();

  const roles = await Role.find().sort({ name: 1 }).select({ key: 1, name: 1 }).lean().exec();
  const roleMap = new Map(roles.map((r) => [String(r._id), { key: r.key, name: r.name }]));

  let warehouseAssigned = new Set<string>();
  if (options?.warehouseId) {
    const wh = await Warehouse.findById(options.warehouseId)
      .select({ assignedUserIds: 1 })
      .lean()
      .exec();
    warehouseAssigned = new Set((wh?.assignedUserIds ?? []).map((id) => String(id)));
  }

  const groupMap = new Map<string, GroupedUserGroup>();

  const ensureGroup = (roleKey: string, roleName: string) => {
    if (!groupMap.has(roleKey)) {
      groupMap.set(roleKey, { roleKey, roleName, options: [] });
    }
    return groupMap.get(roleKey)!;
  };

  if (warehouseAssigned.size > 0) {
    const whGroup = ensureGroup('_warehouse', 'Raktárhoz rendelve');
    for (const u of users) {
      if (warehouseAssigned.has(String(u._id))) {
        whGroup.options.push({
          value: String(u._id),
          label: u.name || u.email,
          sublabel: u.email,
        });
      }
    }
  }

  for (const u of users) {
    const roleIds = u.roleIds ?? [];
    if (!roleIds.length) {
      const g = ensureGroup('_none', 'Nincs szerepkör');
      g.options.push({
        value: String(u._id),
        label: u.name || u.email,
        sublabel: u.email,
      });
      continue;
    }
    for (const rid of roleIds) {
      const role = roleMap.get(String(rid));
      const roleKey = role?.key ?? 'unknown';
      const roleName = role?.name ?? 'Ismeretlen';
      const g = ensureGroup(roleKey, roleName);
      if (!g.options.some((o) => o.value === String(u._id))) {
        g.options.push({
          value: String(u._id),
          label: u.name || u.email,
          sublabel: u.email,
        });
      }
    }
  }

  const groups = [...groupMap.values()]
    .filter((g) => g.options.length > 0)
    .sort((a, b) => {
      if (a.roleKey === '_warehouse') return -1;
      if (b.roleKey === '_warehouse') return 1;
      return a.roleName.localeCompare(b.roleName, 'hu');
    });

  return { groups };
}

export async function getWarehouseAssignedUserIdsAction(warehouseId: string): Promise<string[]> {
  await requireAuth();
  await connectDB();
  const wh = await Warehouse.findById(warehouseId).select({ assignedUserIds: 1 }).lean().exec();
  return (wh?.assignedUserIds ?? []).map((id) => String(id));
}
