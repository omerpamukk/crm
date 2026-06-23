import { getAccountContext } from "@/lib/supabase/account";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Toaster } from "@/components/ui/sonner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { fullName, email, businessName, roleLabel } =
    await getAccountContext();
  const displayName = fullName ?? email ?? "Kullanıcı";

  return (
    <div className="flex min-h-svh">
      {/* Masaüstü yan menü (sticky, tam boy) */}
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 border-r md:block">
        <SidebarNav
          businessName={businessName}
          displayName={displayName}
          roleLabel={roleLabel}
        />
      </aside>

      {/* İçerik */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Üst bar yalnızca mobilde */}
        <header className="flex h-16 items-center gap-2 border-b bg-card px-4 md:hidden">
          <MobileNav
            businessName={businessName}
            displayName={displayName}
            roleLabel={roleLabel}
          />
          <span className="font-semibold">{businessName}</span>
        </header>

        <main className="flex-1 bg-muted/30 p-4 md:p-6">{children}</main>
      </div>

      <Toaster />
    </div>
  );
}
