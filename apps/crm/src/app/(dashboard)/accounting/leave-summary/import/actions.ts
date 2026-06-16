'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@crm/auth';
import { buildLeaveImportPreview, commitLeaveImport, type LeaveImportMatchedRow } from '@crm/core';
import { getHrSessionScope } from '@/lib/hr/session-scope';

export async function parseLeaveExcelAction(formData: FormData) {
  await requirePermission('hr:reports');
  const { allowedCompanyIds } = await getHrSessionScope();

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { success: false as const, message: 'Válasszon Excel fájlt.' };
  }

  const selectedSheets = formData
    .getAll('sheetNames')
    .map((v) => String(v))
    .filter(Boolean);

  try {
    const buffer = await file.arrayBuffer();
    const preview = await buildLeaveImportPreview(
      buffer,
      selectedSheets.length ? selectedSheets : undefined,
      allowedCompanyIds
    );
    return { success: true as const, preview };
  } catch (e) {
    return {
      success: false as const,
      message: e instanceof Error ? e.message : 'Az Excel feldolgozása sikertelen.',
    };
  }
}

export async function commitLeaveImportAction(rows: LeaveImportMatchedRow[]) {
  await requirePermission('hr:reports');
  const { userId, permissions } = await getHrSessionScope();

  const matched = rows.filter((r) => r.status === 'matched');
  if (!matched.length) {
    return { success: false as const, message: 'Nincs importálható, egyező sor.' };
  }

  try {
    const result = await commitLeaveImport(matched, userId, permissions);
    revalidatePath('/accounting/leave-summary');
    return {
      success: true as const,
      message: `Import kész: ${result.entitlementsUpdated} keret, ${result.offEntriesCreated} szabadság nap, ${result.sickEntriesCreated} betegnap.`,
      result,
    };
  } catch (e) {
    return {
      success: false as const,
      message: e instanceof Error ? e.message : 'Import sikertelen.',
    };
  }
}
