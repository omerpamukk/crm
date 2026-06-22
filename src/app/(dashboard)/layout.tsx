import { getAccountContext } from "@/lib/supabase/account";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { LogoutButton } from "@/components/shared/logout-button";
import { Toaster } from "@/components/ui/sonner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { fullName, email, businessName } = await getAccountContext();
  const displayName = fullName ?? email ?? "Kullanıcı";

  return (
    <div className="flex min-h-svh">
      {/* Masaüstü yan menü */}
      <aside className="hidden w-64 flex-col border-r bg-card md:flex">
        <div className="flex h-16 items-center border-b px-6 font-semibold">
          {businessName}
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          <SidebarNav />
        </nav>
      </aside>

      {/* İçerik */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-3 border-b bg-card px-4">
          <div className="flex items-center gap-2">
            <MobileNav businessName={businessName} />
            <span className="font-semibold md:hidden">{businessName}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {displayName}
            </span>
            <LogoutButton />
          </div>
        </header>

        <main className="flex-1 bg-muted/30 p-4 md:p-6">{children}</main>
      </div>

      <Toaster />
    </div>
  );
}
