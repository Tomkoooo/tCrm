import bcrypt from 'bcryptjs';
import { connectDB } from './connection';
import { Permission } from './models/Permission';
import { Role } from './models/Role';
import { User } from './models/User';
import { Warehouse } from './models/Warehouse';

const BASELINE_PERMISSIONS = [
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
    key: 'inventory:read',
    label: 'View Inventory',
    group: 'inventory',
    description: 'View products and stock',
    isSystem: true,
  },
  {
    key: 'inventory:write',
    label: 'Manage Inventory',
    group: 'inventory',
    description: 'Create and edit products',
    isSystem: true,
  },
  {
    key: 'inventory:import',
    label: 'Import Inventory',
    group: 'inventory',
    description: 'Bulk import inventory from Excel',
    isSystem: true,
  },
  {
    key: 'inventory:delete',
    label: 'Delete Inventory',
    group: 'inventory',
    description: 'Delete/deactivate products',
    isSystem: true,
  },
  {
    key: 'offers:read',
    label: 'View Offers',
    group: 'offers',
    description: 'View quotations',
    isSystem: true,
  },
  {
    key: 'offers:write',
    label: 'Manage Offers',
    group: 'offers',
    description: 'Create and edit offers',
    isSystem: true,
  },
  {
    key: 'logistics:read',
    label: 'View Logistics',
    group: 'logistics',
    description: 'View logistics data',
    isSystem: true,
  },
  {
    key: 'logistics:write',
    label: 'Manage Logistics',
    group: 'logistics',
    description: 'Manage logistics operations',
    isSystem: true,
  },
  {
    key: 'warehouses:read',
    label: 'View Warehouses',
    group: 'inventory',
    description: 'View warehouses and stock levels',
    isSystem: true,
  },
  {
    key: 'warehouses:manage',
    label: 'Manage Warehouses',
    group: 'inventory',
    description: 'Create and edit warehouses',
    isSystem: true,
  },
  {
    key: 'suppliers:read',
    label: 'View Suppliers',
    group: 'inventory',
    description: 'View supplier partners',
    isSystem: true,
  },
  {
    key: 'suppliers:manage',
    label: 'Manage Suppliers',
    group: 'inventory',
    description: 'Create and edit suppliers (import partners)',
    isSystem: true,
  },
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
    description: 'Upload images and register external image URLs',
    isSystem: true,
  },
  {
    key: 'media:delete',
    label: 'Delete Media',
    group: 'media',
    description: 'Remove media from the library',
    isSystem: true,
  },
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
];

const BASELINE_ROLES = [
  {
    key: 'admin',
    name: 'Administrator',
    description: 'Full system access',
    permissionKeys: BASELINE_PERMISSIONS.map((p) => p.key),
    isSystem: true,
  },
  {
    key: 'manager',
    name: 'Manager',
    description: 'Operational access without admin settings',
    permissionKeys: [
      'inventory:read',
      'inventory:write',
      'inventory:import',
      'offers:read',
      'offers:write',
      'logistics:read',
      'logistics:write',
      'users:read',
      'warehouses:read',
      'suppliers:read',
      'suppliers:manage',
      'media:read',
      'media:upload',
    ],
    isSystem: true,
  },
  {
    key: 'viewer',
    name: 'Viewer',
    description: 'Read-only access',
    permissionKeys: [
      'inventory:read',
      'offers:read',
      'logistics:read',
      'warehouses:read',
      'suppliers:read',
      'media:read',
    ],
    isSystem: true,
  },
];

/** Permissions + roles required for first-run /setup (no admin user). */
export async function ensureBaselineRbac(): Promise<void> {
  await connectDB();

  const permissionMap = new Map<string, string>();

  for (const perm of BASELINE_PERMISSIONS) {
    const existing = await Permission.findOne({ key: perm.key });
    if (existing) {
      permissionMap.set(perm.key, existing._id.toString());
    } else {
      const created = await Permission.create(perm);
      permissionMap.set(perm.key, created._id.toString());
    }
  }

  for (const role of BASELINE_ROLES) {
    const permissionIds = role.permissionKeys
      .map((key) => permissionMap.get(key))
      .filter((id): id is string => Boolean(id));

    const existing = await Role.findOne({ key: role.key });
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
}

export async function seedDatabase(): Promise<void> {
  await connectDB();

  console.log('Seeding permissions...');
  const permissionMap = new Map<string, string>();

  for (const perm of BASELINE_PERMISSIONS) {
    const existing = await Permission.findOne({ key: perm.key });
    if (existing) {
      permissionMap.set(perm.key, existing._id.toString());
    } else {
      const created = await Permission.create(perm);
      permissionMap.set(perm.key, created._id.toString());
      console.log(`  Created permission: ${perm.key}`);
    }
  }

  console.log('Seeding roles...');
  for (const role of BASELINE_ROLES) {
    const permissionIds = role.permissionKeys
      .map((key) => permissionMap.get(key))
      .filter((id): id is string => Boolean(id));

    const existing = await Role.findOne({ key: role.key });
    if (existing) {
      existing.permissionIds = permissionIds as unknown as typeof existing.permissionIds;
      existing.name = role.name;
      existing.description = role.description;
      await existing.save();
      console.log(`  Updated role: ${role.key}`);
    } else {
      await Role.create({
        key: role.key,
        name: role.name,
        description: role.description,
        permissionIds: permissionIds as never,
        isSystem: role.isSystem,
      });
      console.log(`  Created role: ${role.key}`);
    }
  }

  console.log('Seeding admin user...');
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@tcrm.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'admin123456';

  const adminRole = await Role.findOne({ key: 'admin' });
  if (!adminRole) {
    throw new Error('Admin role not found after seeding');
  }

  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await User.create({
      email: adminEmail,
      name: 'System Admin',
      passwordHash,
      roleIds: [adminRole._id],
      directPermissionKeys: [],
      isActive: true,
    });
    console.log(`  Created admin user: ${adminEmail}`);
  } else {
    console.log(`  Admin user already exists: ${adminEmail}`);
  }

  console.log('Seeding warehouses...');
  const baselineWarehouses = [
    { key: 'kispest', name: 'Kispest raktár', isActive: true },
    { key: 'erzsebet', name: 'Erzsébet raktár', isActive: true },
    { key: 'recsei', name: 'Récsei Raktár', isActive: true },
  ];

  for (const wh of baselineWarehouses) {
    const existing = await Warehouse.findOne({ key: wh.key });
    if (existing) {
      existing.name = wh.name;
      existing.isActive = wh.isActive;
      await existing.save();
      console.log(`  Updated warehouse: ${wh.key}`);
    } else {
      await Warehouse.create(wh);
      console.log(`  Created warehouse: ${wh.key}`);
    }
  }

  console.log('Seed complete.');
}
