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
    <SidebarProvider className="w-full max-w-full">
      <AppSidebar
        serverUser={{
          id: sessionUser.id,
          email: sessionUser.email,
          name: sessionUser.name,
          permissions: sessionUser.permissions,
        }}
      />
      <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <AppHeader />
        <main className="flex-1 pb-4">{children}</main>
      </SidebarInset>
      <Toaster position="bottom-right" />
    </SidebarProvider>
  );
}
