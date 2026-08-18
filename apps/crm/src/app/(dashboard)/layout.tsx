import { SidebarInset, SidebarProvider, Toaster } from '@crm/ui';
import { AppSidebar } from '@/components/app-sidebar';
import AppHeader from '@/components/app-header';
import { requireAuth } from '@crm/auth';
import { userHasEmployeeProfile } from '@crm/hr';
import { ensureRbacBootstrapped } from '@/lib/rbac-bootstrap';
import { ensureLogisticsMailTemplatesSeeded } from '@crm/logistics';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await ensureRbacBootstrapped();
  await ensureLogisticsMailTemplatesSeeded();
  const sessionUser = await requireAuth();
  const hasEmployeeProfile = await userHasEmployeeProfile(sessionUser.id);

  return (
    <SidebarProvider className="h-[calc(100*var(--dvh))] max-h-[calc(100*var(--dvh))] w-full max-w-full overflow-hidden">
      <AppSidebar
        serverUser={{
          id: sessionUser.id,
          email: sessionUser.email,
          name: sessionUser.name,
          permissions: sessionUser.permissions,
          hasEmployeeProfile,
        }}
      />
      <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <AppHeader />
        <main className="min-h-0 flex-1 overflow-y-auto pb-4">{children}</main>
      </SidebarInset>
      <Toaster position="bottom-right" />
    </SidebarProvider>
  );
}
