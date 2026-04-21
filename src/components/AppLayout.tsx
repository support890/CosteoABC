import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TrialBadge } from "@/components/TrialBadge";
import { TrialExpiredOverlay } from "@/components/TrialExpiredOverlay";
import { AccountDeactivatedOverlay } from "@/components/AccountDeactivatedOverlay";
import { UserMenu } from "@/components/UserMenu";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center justify-between border-b px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
            <div className="flex items-center gap-3">
              <TrialBadge />
              <UserMenu />
            </div>
          </header>
          <main className="flex-1 p-3 sm:p-6 animate-fade-in">{children}</main>
        </div>
      </div>
      <TrialExpiredOverlay />
      <AccountDeactivatedOverlay />
    </SidebarProvider>
  );
}
