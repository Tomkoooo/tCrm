import { requirePermission } from '@crm/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePermission('admin:access');
  return <>{children}</>;
}
