import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import AppHeader from '@/components/app-header';
import { Toaster } from '@/components/ui/sonner';
import { requireAuth } from '@crm/auth';
import { ensureBaselineRbacOnce } from '@crm/db';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await ensureBaselineRbacOnce();
  const sessionUser = await requireAuth();

  return (
    <SidebarProvider className="h-[calc(100*var(--dvh))] max-h-[calc(100*var(--dvh))] w-full max-w-full overflow-hidden">
      <AppSidebar
        serverUser={{
          id: sessionUser.id,
          email: sessionUser.email,
          name: sessionUser.name,
          permissions: sessionUser.permissions,
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
