'use server';

import { revalidatePath } from 'next/cache';
import { connectDB, Permission, Role } from '@crm/db-core';
import { requirePermission } from '@crm/auth';
import { resyncRbac } from '@/lib/rbac-bootstrap';

export type PermissionsFormState =
  | { success: false; message: string }
  | { success: true; message: string };

export async function toggleRolePermissionAction(
  _prevState: PermissionsFormState,
  formData: FormData
): Promise<PermissionsFormState> {
  await requirePermission('roles:manage');

  const roleId = String(formData.get('roleId') ?? '');
  const permissionId = String(formData.get('permissionId') ?? '');
  const enabled = formData.get('enabled') === 'true';

  if (!roleId || !permissionId) {
    return { success: false, message: 'Missing role or permission.' };
  }

  await connectDB();
  const role = await Role.findById(roleId);
  if (!role) {
    return { success: false, message: 'Role not found.' };
  }

  if (role.isSystem && role.key === 'admin') {
    return { success: false, message: 'Cannot modify admin role permissions.' };
  }

  const permObjectId = permissionId;
  const hasPermission = role.permissionIds.some((id) => id.toString() === permObjectId);

  if (enabled && !hasPermission) {
    role.permissionIds.push(permObjectId as unknown as (typeof role.permissionIds)[0]);
  } else if (!enabled && hasPermission) {
    role.permissionIds = role.permissionIds.filter((id) => id.toString() !== permObjectId);
  }

  await role.save();
  revalidatePath('/admin/permissions');

  return { success: true, message: 'Permissions updated.' };
}

export async function createRoleAction(
  _prevState: PermissionsFormState,
  formData: FormData
): Promise<PermissionsFormState> {
  await requirePermission('roles:manage');

  const key = String(formData.get('key') ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();

  if (!key || !name) {
    return { success: false, message: 'Key and name are required.' };
  }

  await connectDB();
  const existing = await Role.findOne({ key });
  if (existing) {
    return { success: false, message: 'A role with this key already exists.' };
  }

  await Role.create({ key, name, description, permissionIds: [], isSystem: false });
  revalidatePath('/admin/permissions');

  return { success: true, message: `Role "${name}" created.` };
}

export async function deleteRoleAction(
  _prevState: PermissionsFormState,
  formData: FormData
): Promise<PermissionsFormState> {
  await requirePermission('roles:manage');

  const roleId = String(formData.get('roleId') ?? '');
  if (!roleId) {
    return { success: false, message: 'Missing role ID.' };
  }

  await connectDB();
  const role = await Role.findById(roleId);
  if (!role) {
    return { success: false, message: 'Role not found.' };
  }

  if (role.isSystem) {
    return { success: false, message: 'Cannot delete system roles.' };
  }

  await role.deleteOne();
  revalidatePath('/admin/permissions');

  return { success: true, message: 'Szerepkör törölve.' };
}

export async function syncBaselinePermissionsAction(): Promise<PermissionsFormState> {
  await requirePermission('roles:manage');

  try {
    await resyncRbac();
    revalidatePath('/admin/permissions');
    return {
      success: true,
      message:
        'Szinkron kész. Frissítse az oldalt; a jogosultságok azonnal érvényesülnek (új bejelentkezés nem szükséges).',
    };
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : 'A szinkron sikertelen.',
    };
  }
}

export async function getPermissionsData() {
  await requirePermission('roles:manage');
  await connectDB();

  const [permissions, roles] = await Promise.all([
    Permission.find().sort({ group: 1, key: 1 }).exec(),
    Role.find().populate('permissionIds').sort({ name: 1 }).exec(),
  ]);

  return {
    permissions: permissions.map((p) => ({
      id: p._id.toString(),
      key: p.key,
      label: p.label,
      group: p.group,
      description: p.description,
    })),
    roles: roles.map((r) => ({
      id: r._id.toString(),
      key: r.key,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      permissionIds: (r.permissionIds as unknown as Array<{ _id: { toString(): string } }>).map(
        (p) => p._id.toString()
      ),
    })),
  };
}
