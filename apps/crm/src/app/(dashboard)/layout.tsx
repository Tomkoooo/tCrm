import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import AppHeader from '@/components/app-header';
import { Toaster } from '@/components/ui/sonner';
import { requireAuth } from '@crm/auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();

  return (
    <SidebarProvider className="w-full max-w-full">
      <AppSidebar />
      <SidebarInset className="flex min-h-0 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <AppHeader />
          <main className="flex-1 pb-4">{children}</main>
        </div>
      </SidebarInset>
      <Toaster position="bottom-right" />
    </SidebarProvider>
  );
}
