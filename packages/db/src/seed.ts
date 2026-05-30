import bcrypt from 'bcryptjs';
import { connectDB } from './connection';
import { MailTemplate } from './models/MailTemplate';
import { Permission } from './models/Permission';
import { Role } from './models/Role';
import { User } from './models/User';
import { Warehouse } from './models/Warehouse';
import { BASELINE_MAIL_TEMPLATES } from './seed-templates-data';

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
    key: 'logistics:scope_all',
    label: 'All logistics sites',
    group: 'logistics',
    description: 'View and manage shipments for all warehouses (not scoped to assignment)',
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
  {
    key: 'accounting:read',
    label: 'View Accounting',
    group: 'accounting',
    description: 'Access accounting and HR overview',
    isSystem: true,
  },
  {
    key: 'accounting:write',
    label: 'Manage Accounting',
    group: 'accounting',
    description: 'Manage accounting settings',
    isSystem: true,
  },
  {
    key: 'hr:read',
    label: 'View HR',
    group: 'hr',
    description: 'View employees, schedules, and requests (company-scoped)',
    isSystem: true,
  },
  {
    key: 'hr:write',
    label: 'Manage HR',
    group: 'hr',
    description: 'Manage companies, employees, and schedules',
    isSystem: true,
  },
  {
    key: 'hr:approve',
    label: 'Approve HR Requests',
    group: 'hr',
    description: 'Approve or reject holiday and schedule requests',
    isSystem: true,
  },
  {
    key: 'hr:reports',
    label: 'HR Reports',
    group: 'hr',
    description: 'Edit monthly work summaries and export',
    isSystem: true,
  },
  {
    key: 'hr:scope_all',
    label: 'All companies (HR)',
    group: 'hr',
    description: 'View and manage HR data for all companies',
    isSystem: true,
  },
  {
    key: 'hr:self',
    label: 'Own HR',
    group: 'hr',
    description: 'View own schedule and submit requests',
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
      'logistics:scope_all',
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
  {
    key: 'hr',
    name: 'HR',
    description: 'Human resources and scheduling across companies',
    permissionKeys: [
      'accounting:read',
      'accounting:write',
      'hr:read',
      'hr:write',
      'hr:approve',
      'hr:reports',
      'hr:scope_all',
      'users:read',
      'users:write',
      'mail:send',
    ],
    isSystem: true,
  },
  {
    key: 'employee',
    name: 'Employee',
    description: 'Self-service schedule and time-off requests',
    permissionKeys: ['hr:self'],
    isSystem: true,
  },
];

export type SeedMailTemplatesOptions = {
  /** When true, overwrite existing templates. Default: false (seed missing only). */
  overwrite?: boolean;
};

/** Insert baseline mail templates; skips existing keys unless overwrite is set. */
export async function seedMailTemplates(options: SeedMailTemplatesOptions = {}): Promise<void> {
  await connectDB();
  const overwrite = options.overwrite ?? process.env.SEED_OVERWRITE_TEMPLATES?.trim() === '1';

  for (const tpl of BASELINE_MAIL_TEMPLATES) {
    const existing = await MailTemplate.findOne({ key: tpl.key }).exec();
    if (existing && !overwrite) {
      continue;
    }
    if (existing && overwrite) {
      existing.subject = tpl.subject;
      existing.body = tpl.body;
      existing.description = tpl.description;
      existing.variables = tpl.variables;
      existing.enabled = tpl.enabled;
      existing.recipientRoleKeys = tpl.recipientRoleKeys ?? [];
      existing.isActive = true;
      await existing.save();
      console.log(`  Updated mail template: ${tpl.key}`);
    } else if (!existing) {
      await MailTemplate.create({
        key: tpl.key,
        subject: tpl.subject,
        body: tpl.body,
        description: tpl.description,
        variables: tpl.variables,
        enabled: tpl.enabled,
        recipientRoleKeys: tpl.recipientRoleKeys ?? [],
        recipientUserIds: [],
        isActive: true,
      });
      console.log(`  Created mail template: ${tpl.key}`);
    }
  }
}

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

  await seedMailTemplates();
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

  console.log('Seeding mail templates...');
  await seedMailTemplates();

  console.log('Seed complete.');
}
