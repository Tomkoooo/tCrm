import { requireAuth } from '@crm/auth';

/** HR management routes guard themselves; self-service `/accounting/my` only needs auth + linked employee. */
export default async function AccountingLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return children;
}
