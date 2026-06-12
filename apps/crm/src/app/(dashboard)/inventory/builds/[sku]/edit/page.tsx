import { redirect } from 'next/navigation';
import { requirePermission } from '@crm/auth';

/** @deprecated Use /inventory/[sku]?edit=1 — kept for bookmarks */
export default async function EditBuildRedirectPage({
  params,
}: {
  params: Promise<{ sku: string }>;
}) {
  await requirePermission('inventory:write');
  const { sku } = await params;
  redirect(`/inventory/${encodeURIComponent(decodeURIComponent(sku))}?edit=1`);
}
