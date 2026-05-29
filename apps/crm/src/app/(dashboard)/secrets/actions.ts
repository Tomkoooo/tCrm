'use server';

import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import { requireAuth, requirePermission } from '@crm/auth';
import { connectDB, Role, SecretProject, User } from '@crm/db';
import {
  canDeleteSecretProject,
  canManageSecretProjectAccess,
  canReadSecretProject,
  canWriteSecretProject,
  toSecretAccessUser,
} from '@crm/core';
import { decryptSecret, encryptSecret } from '@crm/lib/utils';
import {
  secretItemSchema,
  secretProjectAccessSchema,
  secretProjectSchema,
} from '@crm/lib/validation';

export type SecretFormState =
  | { success: false; fieldErrors?: Record<string, string[]>; message?: string }
  | { success: true; message?: string; id?: string; value?: string };

function zodToFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || 'form';
    fieldErrors[key] = fieldErrors[key] ?? [];
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}

async function loadSecretAccessUser() {
  const sessionUser = await requireAuth();
  if (!sessionUser) return null;
  await connectDB();
  const dbUser = await User.findById(sessionUser.id).select('roleIds').lean().exec();
  if (!dbUser) {
    return null;
  }
  return toSecretAccessUser(sessionUser, dbUser.roleIds ?? []);
}

async function loadProjectForAccess(projectId: string) {
  if (!mongoose.Types.ObjectId.isValid(projectId)) return null;
  await connectDB();
  return SecretProject.findById(projectId).exec();
}

export async function createSecretProjectAction(
  _prev: SecretFormState,
  formData: FormData
): Promise<SecretFormState> {
  await requirePermission('secrets:write');
  const accessUser = await loadSecretAccessUser();
  if (!accessUser) return { success: false, message: 'Felhasználó nem található.' };

  const parsed = secretProjectSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  await connectDB();
  const project = await SecretProject.create({
    name: parsed.data.name,
    description: parsed.data.description || undefined,
    secrets: [],
    allowedRoles: [],
    allowedUsers: [],
    createdBy: accessUser.id,
  });

  revalidatePath('/secrets');
  return {
    success: true,
    message: 'Titok projekt létrehozva.',
    id: project._id.toString(),
  };
}

export async function deleteSecretProjectAction(projectId: string): Promise<SecretFormState> {
  await requirePermission('secrets:delete');
  const accessUser = await loadSecretAccessUser();
  if (!accessUser) return { success: false, message: 'Felhasználó nem található.' };

  const project = await loadProjectForAccess(projectId);
  if (!project) return { success: false, message: 'Projekt nem található.' };
  if (!canDeleteSecretProject(accessUser, project)) {
    return { success: false, message: 'Nincs jogosultság a projekt törléséhez.' };
  }

  await project.deleteOne();
  revalidatePath('/secrets');
  return { success: true, message: 'Projekt törölve.' };
}

export async function addSecretItemAction(
  projectId: string,
  _prev: SecretFormState,
  formData: FormData
): Promise<SecretFormState> {
  await requirePermission('secrets:write');
  const accessUser = await loadSecretAccessUser();
  if (!accessUser) return { success: false, message: 'Felhasználó nem található.' };

  const project = await loadProjectForAccess(projectId);
  if (!project) return { success: false, message: 'Projekt nem található.' };
  if (!canWriteSecretProject(accessUser, project)) {
    return { success: false, message: 'Nincs jogosultság a titkok szerkesztéséhez.' };
  }

  const parsed = secretItemSchema.safeParse({
    key: formData.get('key'),
    value: formData.get('value'),
    valueFormat: formData.get('valueFormat') === 'multiline' ? 'multiline' : 'single',
    description: formData.get('description') || undefined,
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  const keyLower = parsed.data.key.toLowerCase();
  if (project.secrets.some((s) => s.key.toLowerCase() === keyLower)) {
    return { success: false, message: 'Ez a kulcs már létezik a projektben.' };
  }

  let encrypted: string;
  try {
    encrypted = encryptSecret(parsed.data.value);
  } catch {
    return {
      success: false,
      message: 'Titkosítás sikertelen. Ellenőrizze a SECRETS_ENCRYPTION_KEY beállítást.',
    };
  }

  project.secrets.push({
    key: parsed.data.key,
    value: encrypted,
    valueFormat: parsed.data.valueFormat,
    description: parsed.data.description || undefined,
    updatedBy: new mongoose.Types.ObjectId(accessUser.id),
    updatedAt: new Date(),
  } as never);
  await project.save();

  revalidatePath(`/secrets/${projectId}`);
  return { success: true, message: 'Titok hozzáadva.' };
}

export async function deleteSecretItemAction(
  projectId: string,
  itemId: string
): Promise<SecretFormState> {
  await requirePermission('secrets:write');
  const accessUser = await loadSecretAccessUser();
  if (!accessUser) return { success: false, message: 'Felhasználó nem található.' };

  const project = await loadProjectForAccess(projectId);
  if (!project) return { success: false, message: 'Projekt nem található.' };
  if (!canWriteSecretProject(accessUser, project)) {
    return { success: false, message: 'Nincs jogosultság.' };
  }

  const before = project.secrets.length;
  project.secrets = project.secrets.filter((s) => s._id.toString() !== itemId) as never;
  if (project.secrets.length === before) {
    return { success: false, message: 'Titok nem található.' };
  }

  await project.save();
  revalidatePath(`/secrets/${projectId}`);
  return { success: true, message: 'Titok törölve.' };
}

export async function revealSecretValueAction(
  projectId: string,
  itemId: string
): Promise<SecretFormState> {
  await requirePermission('secrets:read');
  const accessUser = await loadSecretAccessUser();
  if (!accessUser) return { success: false, message: 'Felhasználó nem található.' };

  const project = await loadProjectForAccess(projectId);
  if (!project) return { success: false, message: 'Projekt nem található.' };
  if (!canReadSecretProject(accessUser, project)) {
    return { success: false, message: 'Nincs jogosultság.' };
  }

  const item = project.secrets.find((s) => s._id.toString() === itemId);
  if (!item) return { success: false, message: 'Titok nem található.' };

  try {
    const value = decryptSecret(item.value);
    return { success: true, value };
  } catch {
    return { success: false, message: 'Visszafejtés sikertelen.' };
  }
}

export async function updateSecretProjectAccessAction(
  projectId: string,
  _prev: SecretFormState,
  formData: FormData
): Promise<SecretFormState> {
  await requirePermission('secrets:read');
  const accessUser = await loadSecretAccessUser();
  if (!accessUser) return { success: false, message: 'Felhasználó nem található.' };

  const project = await loadProjectForAccess(projectId);
  if (!project) return { success: false, message: 'Projekt nem található.' };
  if (!canManageSecretProjectAccess(accessUser, project)) {
    return { success: false, message: 'Nincs jogosultság a megosztás kezeléséhez.' };
  }

  const parsed = secretProjectAccessSchema.safeParse({
    allowedRoleIds: formData.getAll('allowedRoleIds').map(String),
    allowedUserIds: formData.getAll('allowedUserIds').map(String),
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: zodToFieldErrors(parsed.error.issues) };
  }

  const roleIds = parsed.data.allowedRoleIds;
  const userIds = parsed.data.allowedUserIds;

  if (roleIds.length > 0) {
    const count = await Role.countDocuments({ _id: { $in: roleIds } }).exec();
    if (count !== roleIds.length) {
      return { success: false, message: 'Érvénytelen szerepkör azonosító.' };
    }
  }

  if (userIds.length > 0) {
    const count = await User.countDocuments({ _id: { $in: userIds } }).exec();
    if (count !== userIds.length) {
      return { success: false, message: 'Érvénytelen felhasználó azonosító.' };
    }
  }

  project.allowedRoles = roleIds.map((id) => new mongoose.Types.ObjectId(id)) as never;
  project.allowedUsers = userIds.map((id) => new mongoose.Types.ObjectId(id)) as never;
  await project.save();

  revalidatePath(`/secrets/${projectId}`);
  revalidatePath('/secrets');
  return { success: true, message: 'Megosztás mentve.' };
}
