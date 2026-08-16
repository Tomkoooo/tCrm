import { connectDB } from '@crm/db-core';
import { ensurePermissionsSynced, registerPermissionModule } from '@crm/rbac';
import { enginePermissions } from '@crm/admin';
import { mediaPermissions } from '@crm/media';
import mongoose from 'mongoose';
import { loadAppEnv } from './load-env';

export default async function globalSetup(): Promise<void> {
  loadAppEnv();

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('[e2e] MONGODB_URI not set — skipping E2E user seed');
    return;
  }

  await connectDB();
  registerPermissionModule(enginePermissions);
  registerPermissionModule(mediaPermissions);
  await ensurePermissionsSynced([enginePermissions, mediaPermissions]);

  await mongoose.disconnect();
}
